CREATE TABLE payment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    transfer_ref VARCHAR(255),
    receipt_file_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    linked_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_submissions_event_id ON payment_submissions(event_id);
CREATE INDEX idx_payment_submissions_client_id ON payment_submissions(client_id);
CREATE INDEX idx_payment_submissions_user_id ON payment_submissions(user_id);
CREATE INDEX idx_payment_submissions_status ON payment_submissions(status);
CREATE INDEX idx_payment_submissions_submitted_at ON payment_submissions(submitted_at DESC);
