/*
# Seed Data: Networks, Gifts, and Cards

## What this does
1. Inserts 3 networks: 5G-NET, al-alam-net, tawfeer-Net
2. Inserts sample gifts with various values and prices
3. Inserts sample cards for each network with unique codes

All inserts use ON CONFLICT DO NOTHING to be idempotent.
*/

-- Networks
INSERT INTO public.networks (name, description, is_active) VALUES
  ('5G-NET', 'شبكة الجيل الخامس عالية السرعة', true),
  ('al-alam-net', 'شبكة العالم للإنترنت', true),
  ('tawfeer-Net', 'شبكة التوفير للإنترنت', true)
ON CONFLICT DO NOTHING;

-- Gifts (6 sample gifts)
INSERT INTO public.gifts (name, value, price, description, terms, is_active, sort_order) VALUES
  ('هدية برونزية', 500, 450, 'هدية رقمية بقيمة 500 ريال قابلة للمبادلة مع بطاقات شبكة', 'صالحة لمدة 30 يوم من تاريخ الشراء', true, 1),
  ('هدية فضية', 1000, 900, 'هدية رقمية بقيمة 1000 ريال قابلة للمبادلة مع بطاقات شبكة', 'صالحة لمدة 30 يوم من تاريخ الشراء', true, 2),
  ('هدية ذهبية', 2000, 1800, 'هدية رقمية بقيمة 2000 ريال قابلة للمبادلة مع بطاقات شبكة', 'صالحة لمدة 60 يوم من تاريخ الشراء', true, 3),
  ('هدية بلاتينية', 5000, 4500, 'هدية رقمية بقيمة 5000 ريال قابلة للمبادلة مع بطاقات شبكة', 'صالحة لمدة 90 يوم من تاريخ الشراء', true, 4),
  ('هدية ماسية', 10000, 9000, 'هدية رقمية بقيمة 10000 ريال قابلة للمبادلة مع بطاقات شبكة', 'صالحة لمدة 90 يوم من تاريخ الشراء', true, 5),
  ('هدية تايجية', 20000, 18000, 'هدية رقمية بقيمة 20000 ريال قابلة للمبادلة مع بطاقات شبكة', 'صالحة لمدة 120 يوم من تاريخ الشراء', true, 6)
ON CONFLICT DO NOTHING;

-- Cards: insert cards for each network and value
DO $$
DECLARE
  net_5g uuid;
  net_alam uuid;
  net_tawfeer uuid;
  card_count integer;
  v_code text;
  v_val numeric;
BEGIN
  SELECT id INTO net_5g FROM public.networks WHERE name = '5G-NET';
  SELECT id INTO net_alam FROM public.networks WHERE name = 'al-alam-net';
  SELECT id INTO net_tawfeer FROM public.networks WHERE name = 'tawfeer-Net';

  FOREACH v_val IN ARRAY ARRAY[500, 1000, 2000, 5000, 10000] LOOP
    FOR card_count IN 1..3 LOOP
      v_code := upper(substring(encode(gen_random_bytes(5), 'hex') FROM 1 FOR 5)) || '-' ||
                upper(substring(encode(gen_random_bytes(5), 'hex') FROM 1 FOR 5)) || '-' ||
                upper(substring(encode(gen_random_bytes(5), 'hex') FROM 1 FOR 5));

      INSERT INTO public.cards (network_id, value, code, status)
      VALUES (net_5g, v_val, v_code, 'available')
      ON CONFLICT (code) DO NOTHING;

      v_code := upper(substring(encode(gen_random_bytes(5), 'hex') FROM 1 FOR 5)) || '-' ||
                upper(substring(encode(gen_random_bytes(5), 'hex') FROM 1 FOR 5)) || '-' ||
                upper(substring(encode(gen_random_bytes(5), 'hex') FROM 1 FOR 5));

      INSERT INTO public.cards (network_id, value, code, status)
      VALUES (net_alam, v_val, v_code, 'available')
      ON CONFLICT (code) DO NOTHING;

      v_code := upper(substring(encode(gen_random_bytes(5), 'hex') FROM 1 FOR 5)) || '-' ||
                upper(substring(encode(gen_random_bytes(5), 'hex') FROM 1 FOR 5)) || '-' ||
                upper(substring(encode(gen_random_bytes(5), 'hex') FROM 1 FOR 5));

      INSERT INTO public.cards (network_id, value, code, status)
      VALUES (net_tawfeer, v_val, v_code, 'available')
      ON CONFLICT (code) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
