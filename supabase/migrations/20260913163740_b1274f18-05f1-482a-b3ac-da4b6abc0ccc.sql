
-- ============ BUSINESS SCHEMA ============
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text NOT NULL,
  tier text NOT NULL DEFAULT 'standard',
  country text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  segment text NOT NULL DEFAULT 'SMB',
  lifetime_value numeric(12,2) NOT NULL DEFAULT 0,
  country text NOT NULL DEFAULT 'DE',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  stock_qty int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'processing',
  channel text NOT NULL DEFAULT 'web',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  placed_at timestamptz NOT NULL DEFAULT now(),
  promised_delivery_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  line_total numeric(12,2) NOT NULL
);

CREATE TABLE public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  carrier text NOT NULL,
  tracking_number text NOT NULL,
  status text NOT NULL DEFAULT 'in_transit',
  delay_days int NOT NULL DEFAULT 0,
  delay_reason text,
  last_scan_location text,
  shipped_at timestamptz,
  estimated_delivery_at timestamptz,
  delivered_at timestamptz
);

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  sentiment text NOT NULL DEFAULT 'neutral',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  issued_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  paid_at timestamptz
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  method text NOT NULL DEFAULT 'card',
  status text NOT NULL DEFAULT 'succeeded',
  paid_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'operator',
  department text NOT NULL DEFAULT 'Customer Operations',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_items_order ON public.order_items(order_id);
CREATE INDEX idx_ship_order ON public.shipments(order_id);
CREATE INDEX idx_tickets_customer ON public.tickets(customer_id);
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);

-- ============ GRANTS + RLS (open demo, read-only for anon on business data) ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies','customers','products','orders','order_items','shipments','tickets','invoices','payments','employees']
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "demo read %1$s" ON public.%1$I FOR SELECT USING (true)', t);
  END LOOP;
END $$;

-- ============ SEED ============
INSERT INTO public.companies (name, industry, tier, country)
SELECT
  (ARRAY['Nordwind','Acme','Helios','Brightline','Vantage','Orbital','Kestrel','Meridian','Cobalt','Lumen','Ironbark','Saphir'])[1 + (i % 12)] || ' ' ||
  (ARRAY['GmbH','Industries','Logistics','Group','Systems','Retail'])[1 + (i % 6)] || ' ' || i,
  (ARRAY['Manufacturing','Retail','Logistics','Healthcare','Energy','Software'])[1 + (i % 6)],
  (ARRAY['enterprise','mid-market','standard'])[1 + (i % 3)],
  (ARRAY['DE','FR','NL','ES','IT','PL'])[1 + (i % 6)]
FROM generate_series(1, 80) i;

INSERT INTO public.products (sku, name, category, unit_price, stock_qty)
SELECT
  'SKU-' || lpad(i::text, 5, '0'),
  (ARRAY['Industrial Sensor','Thermal Module','Control Unit','Power Relay','Edge Gateway','Fiber Kit','Servo Drive','Coolant Pump','Safety Scanner','Rack Shelf'])[1 + (i % 10)] || ' ' || (ARRAY['X','S','Pro','Lite','Max'])[1 + (i % 5)] || (100 + i),
  (ARRAY['Sensors','Power','Networking','Mechanical','Safety'])[1 + (i % 5)],
  round((29 + (i * 7.3)::numeric % 1400)::numeric, 2),
  (i * 13) % 400
FROM generate_series(1, 120) i;

INSERT INTO public.customers (customer_code, full_name, email, phone, company_id, segment, lifetime_value, country)
SELECT
  'CUS-' || lpad(i::text, 5, '0'),
  (ARRAY['Lena','Marc','Sofia','Jonas','Amira','Tobias','Clara','Nils','Ines','Pavel','Greta','Hugo'])[1 + (i % 12)] || ' ' ||
  (ARRAY['Keller','Dupont','Vos','Marino','Novak','Bauer','Silva','Jansen','Weber','Kowalski'])[1 + (i % 10)],
  'customer' || i || '@example-corp.test',
  '+49 30 ' || lpad(((i * 7919) % 9999999)::text, 7, '0'),
  c.id,
  (ARRAY['Enterprise','Mid-Market','SMB'])[1 + (i % 3)],
  round((500 + (i * 137.5)::numeric % 95000)::numeric, 2),
  (ARRAY['DE','FR','NL','ES','IT','PL'])[1 + (i % 6)]
FROM generate_series(1, 500) i
JOIN LATERAL (SELECT id FROM public.companies OFFSET (i % 80) LIMIT 1) c ON true;

INSERT INTO public.orders (order_number, customer_id, status, channel, total_amount, placed_at, promised_delivery_at, delivered_at)
SELECT
  '#' || (40000 + i)::text,
  cu.id,
  s.status,
  (ARRAY['web','partner','sales_rep','marketplace'])[1 + (i % 4)],
  round((120 + (i * 53.7)::numeric % 12000)::numeric, 2),
  now() - ((i % 180) || ' days')::interval,
  now() - ((i % 180) || ' days')::interval + '6 days'::interval,
  CASE WHEN s.status = 'delivered' THEN now() - ((i % 180) || ' days')::interval + '5 days'::interval ELSE NULL END
FROM generate_series(1, 1500) i
JOIN LATERAL (SELECT id FROM public.customers OFFSET (i % 500) LIMIT 1) cu ON true
JOIN LATERAL (SELECT (ARRAY['delivered','delivered','delivered','processing','delayed','cancelled','returned'])[1 + (i % 7)] AS status) s ON true;

INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, line_total)
SELECT o.id, p.id, q.qty, p.unit_price, round(p.unit_price * q.qty, 2)
FROM (SELECT id, row_number() OVER (ORDER BY order_number) rn FROM public.orders) o
JOIN LATERAL generate_series(1, 1 + (o.rn % 3)) g ON true
JOIN LATERAL (SELECT id, unit_price FROM public.products OFFSET ((o.rn * 3 + g) % 120) LIMIT 1) p ON true
JOIN LATERAL (SELECT 1 + ((o.rn + g) % 5) AS qty) q ON true;

INSERT INTO public.shipments (order_id, carrier, tracking_number, status, delay_days, delay_reason, last_scan_location, shipped_at, estimated_delivery_at, delivered_at)
SELECT
  o.id,
  (ARRAY['DHL','UPS','DPD','GLS'])[1 + (o.rn % 4)],
  'TRK' || lpad((900000 + o.rn)::text, 9, '0'),
  CASE o.status WHEN 'delivered' THEN 'delivered' WHEN 'delayed' THEN 'delayed' WHEN 'cancelled' THEN 'cancelled' ELSE 'in_transit' END,
  CASE WHEN o.status = 'delayed' THEN 3 + (o.rn % 12) ELSE 0 END,
  CASE WHEN o.status = 'delayed' THEN (ARRAY['carrier hub congestion','customs inspection','weather disruption','missed pickup scan','address verification'])[1 + (o.rn % 5)] ELSE NULL END,
  (ARRAY['Leipzig Hub','Paris CDG','Rotterdam','Madrid Sur','Milan North','Warsaw East'])[1 + (o.rn % 6)],
  o.placed_at + '1 day'::interval,
  o.promised_delivery_at,
  o.delivered_at
FROM (SELECT id, status, placed_at, promised_delivery_at, delivered_at, row_number() OVER (ORDER BY order_number) rn FROM public.orders) o;

INSERT INTO public.tickets (ticket_number, customer_id, order_id, subject, body, category, priority, status, sentiment, created_at, resolved_at)
SELECT
  'TCK-' || lpad(i::text, 5, '0'),
  o.customer_id,
  o.id,
  (ARRAY['Order delayed for over a week','Refund not received','Invoice amount looks wrong','Package shows wrong scan location','Requesting compensation for late delivery','Product arrived damaged','Need updated delivery date'])[1 + (i % 7)],
  'Customer reports: ' || (ARRAY[
    'The order has been delayed and no new delivery date was communicated.',
    'A refund was promised two weeks ago and has not arrived.',
    'The invoice total does not match the order confirmation.',
    'Tracking has not updated in several days and the customer is worried.',
    'The delivery is late and the customer asks whether compensation applies under the shipping policy.',
    'One unit arrived with visible transport damage and needs replacement.',
    'The customer needs a reliable delivery commitment for a production line.'])[1 + (i % 7)],
  (ARRAY['delivery','refund','billing','shipping','compensation','quality','other'])[1 + (i % 7)],
  (ARRAY['low','medium','high','urgent'])[1 + (i % 4)],
  (ARRAY['open','open','in_progress','resolved','resolved','closed'])[1 + (i % 6)],
  (ARRAY['negative','neutral','negative','frustrated','neutral'])[1 + (i % 5)],
  now() - ((i % 120) || ' days')::interval,
  CASE WHEN (i % 6) >= 3 THEN now() - ((i % 120) || ' days')::interval + '2 days'::interval ELSE NULL END
FROM generate_series(1, 620) i
JOIN LATERAL (SELECT id, customer_id FROM public.orders OFFSET (i * 2 % 1500) LIMIT 1) o ON true;

INSERT INTO public.invoices (invoice_number, customer_id, order_id, amount, tax_amount, status, issued_at, due_at, paid_at)
SELECT
  'INV-2026-' || lpad(i::text, 5, '0'),
  o.customer_id,
  o.id,
  o.total_amount,
  round(o.total_amount * 0.19, 2),
  (ARRAY['paid','paid','open','overdue','credited'])[1 + (i % 5)],
  o.placed_at,
  o.placed_at + '30 days'::interval,
  CASE WHEN (i % 5) < 2 THEN o.placed_at + '12 days'::interval ELSE NULL END
FROM generate_series(1, 260) i
JOIN LATERAL (SELECT id, customer_id, total_amount, placed_at FROM public.orders OFFSET (i * 5 % 1500) LIMIT 1) o ON true;

INSERT INTO public.payments (invoice_id, customer_id, amount, method, status, paid_at)
SELECT inv.id, inv.customer_id, inv.amount, (ARRAY['card','sepa','wire'])[1 + (row_number() OVER ())::int % 3], 'succeeded', inv.paid_at
FROM public.invoices inv WHERE inv.paid_at IS NOT NULL;

INSERT INTO public.employees (full_name, email, role, department) VALUES
  ('Ava Lindqvist','ava.lindqvist@opsmind.test','admin','Platform'),
  ('Daniel Okafor','daniel.okafor@opsmind.test','manager','Customer Operations'),
  ('Marta Rossi','marta.rossi@opsmind.test','operator','Customer Operations'),
  ('Yusuf Demir','yusuf.demir@opsmind.test','operator','Logistics'),
  ('Chloe Martin','chloe.martin@opsmind.test','viewer','Finance');
