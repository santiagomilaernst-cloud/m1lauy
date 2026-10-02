CREATE OR REPLACE FUNCTION public.spin_discount_wheel()
 RETURNS TABLE(prize_code text, discount_percent smallint, is_free_pair boolean, won_at timestamp with time zone, is_new boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID := auth.uid();
  roll NUMERIC;
  selected_code TEXT;
  selected_discount SMALLINT;
  selected_free BOOLEAN := FALSE;
  inserted BOOLEAN := FALSE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

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
    selected_code := 'free_pair';
    selected_discount := NULL;
    selected_free := TRUE;
  ELSIF roll < 0.500004 THEN
    selected_code := 'discount_50';
    selected_discount := 50;
  ELSIF roll < 2.500004 THEN
    selected_code := 'discount_20';
    selected_discount := 20;
  ELSE
    selected_discount := (1 + floor(random() * 12))::SMALLINT;
    selected_code := 'discount_' || selected_discount::TEXT;
  END IF;

  INSERT INTO public.discount_wheel_spins (user_id, prize_code, discount_percent, is_free_pair)
  VALUES (current_user_id, selected_code, selected_discount, selected_free)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING discount_wheel_spins.prize_code,
            discount_wheel_spins.discount_percent,
            discount_wheel_spins.is_free_pair,
            discount_wheel_spins.won_at,
            TRUE
  INTO prize_code, discount_percent, is_free_pair, won_at, is_new;

  IF NOT FOUND THEN
    SELECT s.prize_code, s.discount_percent, s.is_free_pair, s.won_at, FALSE
    INTO prize_code, discount_percent, is_free_pair, won_at, is_new
    FROM public.discount_wheel_spins AS s
    WHERE s.user_id = current_user_id;
  END IF;

  RETURN NEXT;
END;
$function$