ALTER TABLE public.discount_wheel_spins ADD COLUMN redeemed_at TIMESTAMPTZ;
ALTER TABLE public.discount_wheel_spins ADD COLUMN redeemed_order_id TEXT;

CREATE OR REPLACE FUNCTION public.redeem_discount_wheel(p_order_id TEXT)
RETURNS TABLE (prize_code TEXT, discount_percent SMALLINT, is_free_pair BOOLEAN, redeemed_at TIMESTAMPTZ)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_order_id IS NULL OR length(p_order_id) < 10 OR length(p_order_id) > 100 THEN
    RAISE EXCEPTION 'Invalid order reference';
  END IF;
  RETURN QUERY
  UPDATE public.discount_wheel_spins AS s
  SET redeemed_at = now(), redeemed_order_id = p_order_id
  WHERE s.user_id = current_user_id AND s.redeemed_at IS NULL
  RETURNING s.prize_code, s.discount_percent, s.is_free_pair, s.redeemed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_discount_wheel(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_discount_wheel(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_discount_wheel(TEXT) TO service_role;