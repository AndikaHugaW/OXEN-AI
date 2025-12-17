-- PERBAIKAN TRIGGER FINAL
-- Menggunakan versi sederhana tanpa logika count(*) yang rentan error
-- Menambahkan Error Handling (EXCEPTION) agar Auth tidak crash meski Profile gagal dibuat

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    'user' -- Default role user
  );
  RETURN new;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error jika perlu, tapi biarkan user auth terbuat
    -- RAISE NOTICE 'Profile creation failed: %', SQLERRM;
    RETURN new; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
