import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userGiftId, networkId, idempotencyKey } = await req.json();

    if (!userGiftId || !networkId) {
      return new Response(JSON.stringify({ error: "بيانات غير مكتملة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate exchange
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("exchanges")
        .select("id, status, reference")
        .eq("metadata->>idempotency_key", idempotencyKey)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({
          success: true,
          alreadyProcessed: true,
          exchangeId: existing.id,
          reference: existing.reference,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Verify the user_gift belongs to user and is available
    const { data: userGift, error: ugError } = await supabase
      .from("user_gifts")
      .select(`
        id, status, gift_id, user_id,
        gifts(id, name, value, price)
      `)
      .eq("id", userGiftId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ugError || !userGift) {
      return new Response(JSON.stringify({ error: "الهدية غير موجودة" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userGift.status !== "available") {
      return new Response(JSON.stringify({ error: "الهدية مستخدمة أو منتهية" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gift = userGift.gifts as any;
    if (!gift) {
      return new Response(JSON.stringify({ error: "بيانات الهدية غير مكتملة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find an available card matching the gift value on the selected network
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("id, code, value, status, network_id")
      .eq("network_id", networkId)
      .eq("value", gift.value)
      .eq("status", "available")
      .limit(1)
      .maybeSingle();

    if (cardError || !card) {
      return new Response(JSON.stringify({
        error: "لا توجد بطاقات متاحة بهذه القيمة في الشبكة المختارة حالياً"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atomically claim the card: update status from 'available' to 'exchanged' only if still available
    const { data: claimedCard, error: claimError } = await supabase
      .from("cards")
      .update({
        status: "exchanged",
        assigned_to_user_id: user.id,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", card.id)
      .eq("status", "available")
      .select()
      .maybeSingle();

    if (claimError || !claimedCard) {
      // Card was claimed by another request (race condition)
      return new Response(JSON.stringify({
        error: "البطاقة لم تعد متاحة، الرجاء المحاولة مرة أخرى"
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark user_gift as used
    const { error: useGiftError } = await supabase
      .from("user_gifts")
      .update({
        status: "used",
        used_at: new Date().toISOString(),
      })
      .eq("id", userGiftId)
      .eq("status", "available");

    if (useGiftError) {
      // Try to release the card
      await supabase.from("cards")
        .update({ status: "available", assigned_to_user_id: null, assigned_at: null })
        .eq("id", claimedCard.id);
      return new Response(JSON.stringify({ error: "حدث خطأ أثناء تحديث الهدية" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const exchangeRef = `EX-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const txRef = `TX-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Record exchange
    const { data: exchange, error: exError } = await supabase.from("exchanges").insert({
      user_id: user.id,
      user_gift_id: userGiftId,
      network_id: networkId,
      card_id: claimedCard.id,
      status: "success",
      reference: exchangeRef,
    }).select().single();

    if (exError) {
      return new Response(JSON.stringify({ error: "حدث خطأ أثناء حفظ المبادلة" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record transaction
    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "exchange",
      amount: gift.value,
      status: "success",
      reference: txRef,
      description: `مبادلة ${gift.name} ببطاقة شبكة`,
      metadata: { exchange_id: exchange.id, card_id: claimedCard.id, idempotency_key: idempotencyKey },
    });

    // Send notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "تمت المبادلة بنجاح",
      message: `تم مبادلة ${gift.name} ببطاقة شبكة. كود البطاقة: ${claimedCard.code}`,
      type: "exchange",
    });

    return new Response(JSON.stringify({
      success: true,
      exchangeId: exchange.id,
      reference: exchangeRef,
      cardCode: claimedCard.code,
      cardValue: claimedCard.value,
      giftName: gift.name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "حدث خطأ غير متوقع" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
