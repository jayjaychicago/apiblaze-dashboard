import { Project } from '@/types/project';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeploymentStatus } from '@/components/deployment-status';
import { ExternalLink, Settings, Trash2, Github, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onUpdateConfig?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export function ProjectCard({ project, onUpdateConfig, onDelete }: ProjectCardProps) {
  const handleOpenPortal = () => {
    window.open(project.urls.portal, '_blank');
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-xl">{project.display_name}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                v{project.api_version}
              </Badge>
            </div>
            <CardDescription className="font-mono text-xs">
              {project.project_id}.apiblaze.com
            </CardDescription>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onUpdateConfig && (
                <DropdownMenuItem onClick={() => onUpdateConfig(project)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Update Config
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleOpenPortal}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Portal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(project)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Deployment Status */}
        {project.deployment && (
          <div>
            <DeploymentStatus
              status={project.deployment.status}
              ageSeconds={project.deployment.age_seconds}
              durationSeconds={project.deployment.duration_seconds}
              error={project.deployment.error}
            />
          </div>
        )}

        {/* Source Information */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {project.spec_source.type === 'github' && project.spec_source.github && (
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              <span className="font-mono text-xs">
                {project.spec_source.github.owner}/{project.spec_source.github.repo}
              </span>
              <Badge variant="outline" className="text-xs">
                {project.spec_source.github.branch}
              </Badge>
            </div>
          )}
          {project.spec_source.type === 'target_only' && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="text-xs">Target URL Only</span>
            </div>
          )}
          {project.spec_source.type === 'upload' && (
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              <span className="text-xs">Uploaded Spec</span>
            </div>
          )}
        </div>

        {/* Deployer Information */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {project.deployer?.avatar_url ? (
            <img
              src={project.deployer.avatar_url}
              alt={project.deployer.name || project.deployer.github_username || 'User'}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs">
              {(project.deployer?.name || project.deployer?.github_username || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs font-medium">
              {project.deployer?.name || project.deployer?.github_username || 'Unknown'}
            </span>
            {project.deployer?.email && (
              <span className="text-xs text-muted-foreground">{project.deployer.email}</span>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleOpenPortal} className="flex-1">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Portal
        </Button>
        {onUpdateConfig && (
          <Button variant="outline" size="sm" onClick={() => onUpdateConfig(project)} className="flex-1">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}