import { getApiDocs } from '@/lib/swagger';
import ReactSwagger from './react-swagger';

export default async function ApiDocsPage() {
  const spec = getApiDocs();

  return (
    <section className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Nvoim Planner Pro API 문서</h1>
        <p className="text-muted-foreground">
          엔보임 플래너 프로의 REST API 문서입니다. 아래에서 각 엔드포인트를 테스트할 수 있습니다.
        </p>
      </div>
      <ReactSwagger spec={spec} />
    </section>
  );
}
