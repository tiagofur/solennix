package handlers

import "testing"

func TestFeatureAvailable_PublicProfileBasic_AllPlans(t *testing.T) {
	for _, plan := range []string{"basic", "free", "gratis", "pro", "business", "premium"} {
		if !FeatureAvailable(plan, "public_profile_basic") {
			t.Errorf("public_profile_basic must be available for plan %q", plan)
		}
	}
}

func TestFeatureAvailable_PublicProfileFull_ProAndBusinessOnly(t *testing.T) {
	cases := []struct {
		plan string
		want bool
	}{
		{plan: "basic", want: false},
		{plan: "free", want: false},
		{plan: "gratis", want: false},
		{plan: "pro", want: true},
		{plan: "premium", want: true},
		{plan: "business", want: true},
		{plan: "enterprise", want: true},
	}

	for _, tc := range cases {
		got := FeatureAvailable(tc.plan, "public_profile_full")
		if got != tc.want {
			t.Errorf("FeatureAvailable(%q, public_profile_full) = %v, want %v", tc.plan, got, tc.want)
		}
	}
}

func TestFeatureAvailable_UnknownFeatureDenied(t *testing.T) {
	if FeatureAvailable("pro", "not_a_real_feature") {
		t.Fatal("unknown feature must be denied")
	}
}
