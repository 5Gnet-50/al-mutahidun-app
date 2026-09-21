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

    const { giftId, method, idempotencyKey } = await req.json();

    if (!giftId || !method) {
      return new Response(JSON.stringify({ error: "بيانات غير مكتملة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate payment via idempotency key
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("payments")
        .select("id, status, reference")
        .eq("metadata->>idempotency_key", idempotencyKey)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({
          success: true,
          alreadyProcessed: true,
          paymentId: existing.id,
          reference: existing.reference,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch gift
    const { data: gift, error: giftError } = await supabase
      .from("gifts")
      .select("id, name, value, price, is_active")
      .eq("id", giftId)
      .maybeSingle();

    if (giftError || !gift) {
      return new Response(JSON.stringify({ error: "الهدية غير موجودة" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!gift.is_active) {
      return new Response(JSON.stringify({ error: "الهدية غير متاحة حالياً" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate references
    const paymentRef = `PAY-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const txRef = `TX-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Simulate payment processing (MVP)
    await new Promise((r) => setTimeout(r, 1500));

    // 95% success rate for simulation
    const isSuccess = Math.random() > 0.05;

    if (!isSuccess) {
      // Record failed payment
      await supabase.from("payments").insert({
        user_id: user.id,
        gift_id: giftId,
        method,
        amount: gift.price,
        status: "failed",
        reference: paymentRef,
      });

      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "purchase",
        amount: gift.price,
        status: "failed",
        reference: txRef,
        description: `فشل شراء ${gift.name}`,
      });

      return new Response(JSON.stringify({ error: "فشلت عملية الدفع، الرجاء المحاولة مرة أخرى" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record successful payment
    const { data: payment, error: payError } = await supabase.from("payments").insert({
      user_id: user.id,
      gift_id: giftId,
      method,
      amount: gift.price,
      status: "success",
      reference: paymentRef,
    }).select().single();

    if (payError) {
      return new Response(JSON.stringify({ error: "حدث خطأ أثناء حفظ عملية الدفع" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Issue gift to user
    const { data: userGift, error: giftIssueError } = await supabase.from("user_gifts").insert({
      user_id: user.id,
      gift_id: giftId,
      status: "available",
    }).select().single();

    if (giftIssueError) {
      return new Response(JSON.stringify({ error: "حدث خطأ أثناء إصدار الهدية" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record transaction
    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "purchase",
      amount: gift.price,
      status: "success",
      reference: txRef,
      description: `شراء ${gift.name} - دفع ${method}`,
      metadata: { payment_id: payment.id, user_gift_id: userGift.id, idempotency_key: idempotencyKey },
    });

    // Send notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "تمت عملية الشراء بنجاح",
      message: `تم شراء ${gift.name} بنجاح. يمكنك الآن مبادلتها مع بطاقة شبكة.`,
      type: "payment",
    });

    return new Response(JSON.stringify({
      success: true,
      paymentId: payment.id,
      userGiftId: userGift.id,
      reference: paymentRef,
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
