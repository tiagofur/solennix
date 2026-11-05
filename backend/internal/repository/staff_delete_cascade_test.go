package repository

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestStaffDelete_CascadesAssignmentsInSchema pins the verified delete
// semantics of DELETE /staff/{id} (issue #1348): removing a staff member
// also removes their event assignments via ON DELETE CASCADE. Both clients'
// delete copy must describe this behavior.
func TestStaffDelete_CascadesAssignmentsInSchema(t *testing.T) {
	sql, err := os.ReadFile(filepath.Join("..", "database", "migrations", "042_create_staff_and_event_staff.up.sql"))
	if err != nil {
		t.Fatalf("read migration 042: %v", err)
	}
	body := string(sql)
	if !strings.Contains(body, "staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE") {
		t.Errorf("event_staff.staff_id must be ON DELETE CASCADE so deleting staff removes assignments")
	}
}
