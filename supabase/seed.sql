-- Optional seed data for Fitz AI outfit generation.
-- Apply after running the migration. Replace image_url values with your Supabase storage URLs.

insert into wardrobe_items (id, user_id, name, category, color, style, image_url) values
  ('w1', 'demo_user', 'White Oxford Shirt', 'top', 'white', array['casual', 'smart'], 'storage://Clothes/Top/white-oxford.jpg'),
  ('w2', 'demo_user', 'Blue Straight Jeans', 'bottom', 'blue', array['casual'], 'storage://Clothes/Bottom/blue-jeans.jpg'),
  ('w3', 'demo_user', 'White Sneakers', 'shoes', 'white', array['casual'], 'storage://Clothes/Shoes/white-sneakers.jpg')
on conflict (id) do nothing;

insert into marketplace_items (id, name, category, color, style, price, image_url, buy_url) values
  ('m1', 'Linen Blazer', 'outerwear', 'beige', array['smart casual'], 89.00, 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400', 'https://example.com/m1'),
  ('m2', 'Terracotta Tee', 'top', 'terracotta', array['casual'], 29.00, 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400', 'https://example.com/m2')
on conflict (id) do nothing;
