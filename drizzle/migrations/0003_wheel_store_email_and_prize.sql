ALTER TABLE public.discount_wheel_spins ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE public.discount_wheel_spins ADD COLUMN IF NOT EXISTS prize_label text;

CREATE OR REPLACE FUNCTION public.spin_discount_wheel()
 RETURNS TABLE(prize_code text, discount_percent smallint, is_free_pair boolean, won_at timestamp with time zone, is_new boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID := auth.uid();
  current_email TEXT;
  roll NUMERIC;
  selected_code TEXT;
  selected_discount SMALLINT;
  selected_free BOOLEAN := FALSE;
  selected_label TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT u.email INTO current_email FROM auth.users AS u WHERE u.id = current_user_id;

  SELECT s.prize_code, s.discount_percent, s.is_free_pair, s.won_at, FALSE
  INTO prize_code, discount_percent, is_free_pair, won_at, is_new
  FROM public.discount_wheel_spins AS s
  WHERE s.user_id = current_user_id;

  IF FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;

  roll := random() * 100;
  IF roll < 0.000004 THEN
    selected_code := 'free_pair'; selected_discount := NULL; selected_free := TRUE;
    selected_label := 'Par gratis';
  ELSIF roll < 0.500004 THEN
    selected_code := 'discount_50'; selected_discount := 50;
  ELSIF roll < 2.500004 THEN
    selected_code := 'discount_20'; selected_discount := 20;
  ELSE
    selected_discount := (1 + floor(random() * 12))::SMALLINT;
    selected_code := 'discount_' || selected_discount::TEXT;
  END IF;
  IF selected_label IS NULL THEN
    selected_label := selected_discount::TEXT || '% de descuento';
  END IF;

  INSERT INTO public.discount_wheel_spins (user_id, prize_code, discount_percent, is_free_pair, user_email, prize_label)
  VALUES (current_user_id, selected_code, selected_discount, selected_free, current_email, selected_label)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING discount_wheel_spins.prize_code, discount_wheel_spins.discount_percent,
            discount_wheel_spins.is_free_pair, discount_wheel_spins.won_at, TRUE
  INTO prize_code, discount_percent, is_free_pair, won_at, is_new;

  IF NOT FOUND THEN
    SELECT s.prize_code, s.discount_percent, s.is_free_pair, s.won_at, FALSE
    INTO prize_code, discount_percent, is_free_pair, won_at, is_new
    FROM public.discount_wheel_spins AS s
    WHERE s.user_id = current_user_id;
  END IF;

  RETURN NEXT;
END;
$function$;