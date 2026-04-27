import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Eye, Plus, Trash2, Users } from "lucide-react";
import { RowActionMenu } from "@/components/RowActionMenu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import Empty from "@/components/Empty";
import { SkeletonTable } from "@/components/Skeleton";
import { useTranslation } from "react-i18next";
import {
  useDeleteStaffTeam,
  useStaffTeams,
} from "@/hooks/queries/useStaffQueries";

export const StaffTeamList: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["staff"]);
  const { data: teams = [], isLoading } = useStaffTeams();
  const deleteTeam = useDeleteStaffTeam();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };
  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);
    deleteTeam.mutate(id);
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        title={t("staff:teams.list.delete_confirm.title")}
        description={t("staff:teams.list.delete_confirm.description")}
        confirmText={t("staff:teams.list.delete_confirm.confirm")}
        cancelText={t("staff:teams.list.delete_confirm.cancel")}
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />

      <Link
        to="/staff"
        className="inline-flex items-center text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" /> {t("staff:teams.list.back")}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">{t("staff:teams.list.title")}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {t("staff:teams.list.description")}
          </p>
        </div>
        <Link
          to="/staff/teams/new"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02]"
        >
          <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
          {t("staff:teams.list.new_team")}
        </Link>
      </div>

      <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
        {isLoading ? (
          <SkeletonTable
            rows={4}
            columns={[{ width: "w-48" }, { width: "w-36" }, { width: "w-24" }, { width: "w-20" }]}
          />
        ) : teams.length === 0 ? (
          <Empty
            icon={Users}
            title={t("staff:teams.list.empty.title")}
            description={t("staff:teams.list.empty.description")}
            action={
              <Link
                to="/staff/teams/new"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg transition-all hover:scale-[1.02]"
              >
                <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
                {t("staff:teams.list.empty.action")}
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border" aria-label="Tabla de equipos">
              <caption className="sr-only">
                {t("staff:teams.list.table.summary", { count: teams.length })}
              </caption>
              <thead className="bg-surface-alt">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary">
                    {t("staff:teams.list.table.name")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary">
                    {t("staff:teams.list.table.role")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary">
                    {t("staff:teams.list.table.members")}
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">{t("staff:teams.list.table.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {teams.map((team) => (
                  <tr
                    key={team.id}
                    className="group hover:bg-surface-alt/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/staff/teams/${team.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold"
                          aria-hidden="true"
                        >
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="ml-4 text-sm font-semibold text-text">{team.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {team.role_label ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent dark:bg-accent/20">
                        {team.member_count ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <RowActionMenu
                          items={[
                            {
                              label: t("staff:teams.list.table.view_detail"),
                              icon: Eye,
                              onClick: () => navigate(`/staff/teams/${team.id}`),
                            },
                            {
                              label: t("staff:teams.list.table.edit"),
                              icon: Edit,
                              onClick: () => navigate(`/staff/teams/${team.id}/edit`),
                            },
                            {
                              label: t("staff:teams.list.table.delete"),
                              icon: Trash2,
                              onClick: () => requestDelete(team.id),
                              variant: "destructive" as const,
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
