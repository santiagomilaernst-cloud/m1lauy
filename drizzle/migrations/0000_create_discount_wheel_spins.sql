CREATE TABLE public.discount_wheel_spins (
  user_id UUID PRIMARY KEY,
  prize_code TEXT NOT NULL CHECK (prize_code IN ('discount_1','discount_2','discount_3','discount_4','discount_5','discount_6','discount_7','discount_8','discount_9','discount_10','discount_11','discount_12','discount_20','discount_50','free_pair')),
  discount_percent SMALLINT CHECK (discount_percent BETWEEN 1 AND 100),
  is_free_pair BOOLEAN NOT NULL DEFAULT FALSE,
  won_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((is_free_pair AND discount_percent IS NULL) OR (NOT is_free_pair AND discount_percent IS NOT NULL))
);

GRANT SELECT ON public.discount_wheel_spins TO authenticated;
GRANT ALL ON public.discount_wheel_spins TO service_role;

ALTER TABLE public.discount_wheel_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own wheel result"
ON public.discount_wheel_spins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.spin_discount_wheel()
RETURNS TABLE (
  prize_code TEXT,
  discount_percent SMALLINT,
  is_free_pair BOOLEAN,
  won_at TIMESTAMPTZ,
  is_new BOOLEAN
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF roll < 0.004 THEN
    selected_code := 'free_pair';
    selected_discount := NULL;
    selected_free := TRUE;
  ELSIF roll < 0.504 THEN
    selected_code := 'discount_50';
    selected_discount := 50;
  ELSIF roll < 2.504 THEN
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
$$;

REVOKE ALL ON FUNCTION public.spin_discount_wheel() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spin_discount_wheel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.spin_discount_wheel() TO service_role;