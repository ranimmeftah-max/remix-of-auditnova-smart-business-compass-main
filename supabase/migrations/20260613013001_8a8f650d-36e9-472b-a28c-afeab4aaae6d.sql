
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_at text := COALESCE(NEW.raw_user_meta_data->>'account_type', 'enterprise');
  v_wc text := NEW.raw_user_meta_data->>'wilaya_code';
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone, wilaya_code, account_type, account_subtype, locale)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    CASE WHEN v_wc ~ '^\d+$' THEN v_wc::int ELSE NULL END,
    v_at::account_type,
    NEW.raw_user_meta_data->>'account_subtype',
    COALESCE(NEW.raw_user_meta_data->>'locale', 'ar')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles for existing users
INSERT INTO public.profiles (id, first_name, last_name, email, phone, wilaya_code, account_type, account_subtype, locale)
SELECT
  u.id,
  u.raw_user_meta_data->>'first_name',
  u.raw_user_meta_data->>'last_name',
  u.email,
  u.raw_user_meta_data->>'phone',
  CASE WHEN (u.raw_user_meta_data->>'wilaya_code') ~ '^\d+$' THEN (u.raw_user_meta_data->>'wilaya_code')::int ELSE NULL END,
  COALESCE(u.raw_user_meta_data->>'account_type', 'enterprise')::account_type,
  u.raw_user_meta_data->>'account_subtype',
  COALESCE(u.raw_user_meta_data->>'locale', 'ar')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
