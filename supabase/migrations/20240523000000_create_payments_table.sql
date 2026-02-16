-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR NOT NULL DEFAULT 'cash', -- cash, transfer, card, etc.
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own payments" 
    ON public.payments FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" 
    ON public.payments FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" 
    ON public.payments FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments" 
    ON public.payments FOR DELETE 
    USING (auth.uid() = user_id);
