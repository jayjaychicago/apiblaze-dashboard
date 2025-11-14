type FetchOpenApiParams = {
  projectId: string;
  apiVersion: string;
  environment?: string;
};

export async function fetchOpenApiSpec({
  projectId,
  apiVersion,
  environment = 'prod',
}: FetchOpenApiParams): Promise<Record<string, unknown>> {
  const searchParams = new URLSearchParams({
    environment,
  });

  const response = await fetch(
    `/api/openapi/${encodeURIComponent(projectId)}/${encodeURIComponent(apiVersion)}?${searchParams.toString()}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to fetch OpenAPI spec.');
  }

  const payload = (await response.json()) as {
    spec: Record<string, unknown>;
  };

  return payload.spec;
}

