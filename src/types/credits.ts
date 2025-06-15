
export interface CreditPlan {
    id: string;
    name: string;
    credits_included: number;
    price: number;
    duration_days: number | null;
    created_at: string;
}
