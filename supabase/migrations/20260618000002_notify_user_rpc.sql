CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nid UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, body, link, type)
  VALUES (p_user_id, p_title, p_body, p_link, COALESCE(NULLIF(p_type, ''), 'info'))
  RETURNING id INTO nid;
  RETURN nid;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
