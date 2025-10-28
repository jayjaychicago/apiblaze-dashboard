import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await params;
    
    // Get GitHub access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Initialize Octokit
    const octokit = new Octokit({ 
      auth: accessToken,
      request: {
        timeout: 15000 // 15 second timeout for tree scan
      }
    });

    // Get repository's default branch
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    // Get repository tree recursively to find all files
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: 'true',
    });

    // Common OpenAPI/Swagger file patterns
    const openAPIPatterns = [
      /openapi\.(yaml|yml|json)$/i,
      /swagger\.(yaml|yml|json)$/i,
      /api\.(yaml|yml|json)$/i,
      /oas\.(yaml|yml|json)$/i,
    ];

    // Find potential OpenAPI files
    const potentialFiles = tree.tree.filter((item: any) => {
      if (item.type !== 'blob') return false;
      return openAPIPatterns.some(pattern => pattern.test(item.path || ''));
    });

    // Verify each file is actually an OpenAPI spec
    const detectedSpecs = await Promise.all(
      potentialFiles.map(async (file: any) => {
        try {
          // Fetch file content
          const { data: fileData } = await octokit.repos.getContent({
            owner,
            repo,
            path: file.path,
            ref: defaultBranch,
          });

          if ('content' in fileData) {
            // Decode base64 content
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            
            // Quick check if it's an OpenAPI/Swagger spec
            const isOpenAPI = content.includes('openapi:') || content.includes('"openapi"');
            const isSwagger = content.includes('swagger:') || content.includes('"swagger"');
            
            if (isOpenAPI || isSwagger) {
              // Try to extract version
              let version = '1.0.0';
              const openAPIMatch = content.match(/openapi:\s*['"]?(\d+\.\d+\.\d+)/i);
              const swaggerMatch = content.match(/swagger:\s*['"]?(\d+\.\d+)/i);
              
              if (openAPIMatch) {
                version = openAPIMatch[1];
              } else if (swaggerMatch) {
                version = swaggerMatch[1];
              }

              return {
                name: file.path.split('/').pop(),
                path: file.path,
                type: isOpenAPI ? 'openapi' : 'swagger',
                version,
              };
            }
          }
          
          return null;
        } catch (error) {
          console.error(`Error checking file ${file.path}:`, error);
          return null;
        }
      })
    );

    // Filter out nulls and return
    const validSpecs = detectedSpecs.filter(spec => spec !== null);
    
    return NextResponse.json(validSpecs);
  } catch (error: any) {
    console.error('Error detecting OpenAPI specs:', error.message);
    return NextResponse.json(
      { error: 'Failed to detect OpenAPI specifications' },
      { status: 500 }
    );
  }
}
