-- Profiles: 1 por usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  premium_since TIMESTAMPTZ,
  hotmart_transaction TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.doc_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tema TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doc_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own usage" ON public.doc_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users insert own usage" ON public.doc_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_doc_usage_user ON public.doc_usage(user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.can_generate(_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _premium BOOLEAN;
  _count INT;
  _limit INT := 3;
BEGIN
  SELECT is_premium INTO _premium FROM public.profiles WHERE user_id = _user_id;
  SELECT COUNT(*) INTO _count FROM public.doc_usage WHERE user_id = _user_id;
  RETURN jsonb_build_object(
    'allowed', COALESCE(_premium, false) OR _count < _limit,
    'is_premium', COALESCE(_premium, false),
    'used', _count,
    'limit', _limit
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_generate(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.ip_usage (
  ip TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  last_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_usage ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER ip_usage_updated_at
  BEFORE UPDATE ON public.ip_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();