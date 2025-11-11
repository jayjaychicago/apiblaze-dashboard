'use client';

import { useEffect, useState } from 'react';
import { Project, ProjectListResponse } from '@/types/project';
import { ProjectCard } from '@/components/project-card';
import { deleteProject, listProjects } from '@/lib/api/projects';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProjectListProps {
  teamId?: string;
  onUpdateConfig?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onRefresh?: () => void;
}

export function ProjectList({ teamId, onUpdateConfig, onDelete: onDeleteCallback, onRefresh }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchProjects = async (currentPage: number = 1): Promise<ProjectListResponse | undefined> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await listProjects({
        team_id: teamId,
        page: currentPage,
        limit: 12,
      });

      setProjects(response.projects);
      setTotalPages(response.pagination.total_pages);
      setPage(response.pagination.page);
      return response;
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError(err.message || 'Failed to load projects');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load projects',
        variant: 'destructive',
      });
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects(1);
  }, [teamId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProjects(page);
    setRefreshing(false);
    if (onRefresh) {
      onRefresh();
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchProjects(newPage);
  };

  const handleDeleteRequest = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deleting) {
      return;
    }

    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    try {
      setDeleting(true);

      await deleteProject(projectToDelete.project_id, projectToDelete.api_version);

      const response = await fetchProjects(page);

      if (response && response.projects.length === 0 && response.pagination.page > 1) {
        await fetchProjects(response.pagination.page - 1);
      }

      toast({
        title: 'Project deleted',
        description: `${projectToDelete.display_name} has been removed.`,
      });

      onDeleteCallback?.(projectToDelete);
      onRefresh?.();
      closeDeleteDialog();
    } catch (err: any) {
      console.error('Error deleting project:', err);
      toast({
        title: 'Failed to delete project',
        description: err?.message || 'An unexpected error occurred while deleting the project.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      closeDeleteDialog();
    } else if (projectToDelete) {
      setDeleteDialogOpen(true);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => fetchProjects(1)} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Projects</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard
            key={project.project_id}
            project={project}
            onUpdateConfig={onUpdateConfig}
            onDelete={handleDeleteRequest}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>

      <Dialog open={deleteDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This action cannot be undone.{' '}
              {projectToDelete ? `${projectToDelete.display_name} (${projectToDelete.project_id})` : 'This project'} will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete Project'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


