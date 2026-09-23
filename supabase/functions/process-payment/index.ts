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

    // Verify the user with their JWT (anon key + user token)
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data: { user } } = await userClient.auth.getUser();
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

    if (!idempotencyKey) {
      return new Response(JSON.stringify({ error: "مفتاح Idempotency مطلوب" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client to call the atomic RPC function
    // The RPC function validates the gift, checks idempotency, and performs
    // all inserts atomically within a single database transaction
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: result, error: rpcError } = await serviceClient.rpc(
      "process_gift_payment",
      {
        p_user_id: user.id,
        p_gift_id: giftId,
        p_method: method,
        p_idempotency_key: idempotencyKey,
      }
    );

    if (rpcError) {
      return new Response(JSON.stringify({ error: "حدث خطأ أثناء معالجة الدفع" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rpcResult = result as Record<string, unknown>;

    if (rpcResult.error) {
      return new Response(JSON.stringify({ error: rpcResult.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rpcResult.duplicate) {
      return new Response(JSON.stringify({
        success: true,
        alreadyProcessed: true,
        paymentId: rpcResult.payment_id,
        reference: rpcResult.reference,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      paymentId: rpcResult.payment_id,
      userGiftId: rpcResult.user_gift_id,
      reference: rpcResult.reference,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
