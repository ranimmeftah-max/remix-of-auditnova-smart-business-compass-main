
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.account_type AS ENUM ('enterprise', 'professional', 'academic', 'investor');
CREATE TYPE public.subscription_plan AS ENUM ('free', 'monthly', 'annual');
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled');

-- WILAYAS
CREATE TABLE public.wilayas (
  code INT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL
);
GRANT SELECT ON public.wilayas TO anon, authenticated;
GRANT ALL ON public.wilayas TO service_role;
ALTER TABLE public.wilayas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wilayas are publicly readable" ON public.wilayas FOR SELECT USING (true);

INSERT INTO public.wilayas (code, name_ar, name_fr, name_en) VALUES
(1,'أدرار','Adrar','Adrar'),(2,'الشلف','Chlef','Chlef'),(3,'الأغواط','Laghouat','Laghouat'),
(4,'أم البواقي','Oum El Bouaghi','Oum El Bouaghi'),(5,'باتنة','Batna','Batna'),(6,'بجاية','Béjaïa','Bejaia'),
(7,'بسكرة','Biskra','Biskra'),(8,'بشار','Béchar','Bechar'),(9,'البليدة','Blida','Blida'),
(10,'البويرة','Bouira','Bouira'),(11,'تمنراست','Tamanrasset','Tamanrasset'),(12,'تبسة','Tébessa','Tebessa'),
(13,'تلمسان','Tlemcen','Tlemcen'),(14,'تيارت','Tiaret','Tiaret'),(15,'تيزي وزو','Tizi Ouzou','Tizi Ouzou'),
(16,'الجزائر','Alger','Algiers'),(17,'الجلفة','Djelfa','Djelfa'),(18,'جيجل','Jijel','Jijel'),
(19,'سطيف','Sétif','Setif'),(20,'سعيدة','Saïda','Saida'),(21,'سكيكدة','Skikda','Skikda'),
(22,'سيدي بلعباس','Sidi Bel Abbès','Sidi Bel Abbes'),(23,'عنابة','Annaba','Annaba'),(24,'قالمة','Guelma','Guelma'),
(25,'قسنطينة','Constantine','Constantine'),(26,'المدية','Médéa','Medea'),(27,'مستغانم','Mostaganem','Mostaganem'),
(28,'المسيلة','M''Sila','MSila'),(29,'معسكر','Mascara','Mascara'),(30,'ورقلة','Ouargla','Ouargla'),
(31,'وهران','Oran','Oran'),(32,'البيض','El Bayadh','El Bayadh'),(33,'إليزي','Illizi','Illizi'),
(34,'برج بوعريريج','Bordj Bou Arréridj','Bordj Bou Arreridj'),(35,'بومرداس','Boumerdès','Boumerdes'),
(36,'الطارف','El Tarf','El Tarf'),(37,'تندوف','Tindouf','Tindouf'),(38,'تيسمسيلت','Tissemsilt','Tissemsilt'),
(39,'الوادي','El Oued','El Oued'),(40,'خنشلة','Khenchela','Khenchela'),(41,'سوق أهراس','Souk Ahras','Souk Ahras'),
(42,'تيبازة','Tipaza','Tipaza'),(43,'ميلة','Mila','Mila'),(44,'عين الدفلى','Aïn Defla','Ain Defla'),
(45,'النعامة','Naâma','Naama'),(46,'عين تموشنت','Aïn Témouchent','Ain Temouchent'),(47,'غرداية','Ghardaïa','Ghardaia'),
(48,'غليزان','Relizane','Relizane'),(49,'تيميمون','Timimoun','Timimoun'),(50,'برج باجي مختار','Bordj Badji Mokhtar','Bordj Badji Mokhtar'),
(51,'أولاد جلال','Ouled Djellal','Ouled Djellal'),(52,'بني عباس','Béni Abbès','Beni Abbes'),(53,'عين صالح','In Salah','In Salah'),
(54,'عين قزام','In Guezzam','In Guezzam'),(55,'تقرت','Touggourt','Touggourt'),(56,'جانت','Djanet','Djanet'),
(57,'المغير','El M''Ghair','El MGhair'),(58,'المنيعة','El Meniaa','El Meniaa');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  wilaya_code INT REFERENCES public.wilayas(code),
  account_type public.account_type NOT NULL DEFAULT 'enterprise',
  account_subtype TEXT,
  locale TEXT NOT NULL DEFAULT 'ar',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  discount_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- HANDLE NEW USER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _acct public.account_type;
  _subtype TEXT;
  _wilaya INT;
BEGIN
  BEGIN
    _acct := COALESCE((NEW.raw_user_meta_data->>'account_type')::public.account_type, 'enterprise');
  EXCEPTION WHEN OTHERS THEN _acct := 'enterprise';
  END;
  _subtype := NEW.raw_user_meta_data->>'account_subtype';
  BEGIN
    _wilaya := NULLIF(NEW.raw_user_meta_data->>'wilaya_code','')::INT;
  EXCEPTION WHEN OTHERS THEN _wilaya := NULL;
  END;

  INSERT INTO public.profiles (id, first_name, last_name, email, phone, wilaya_code, account_type, account_subtype, locale)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    _wilaya,
    _acct,
    NEW.raw_user_meta_data->>'account_subtype',
    COALESCE(NEW.raw_user_meta_data->>'locale','ar')
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at)
  VALUES (NEW.id, 'free', 'trialing', now() + INTERVAL '14 days');

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
