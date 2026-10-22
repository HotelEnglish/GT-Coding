import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';

export const AuditExportPanel: React.FC = () => {
  const { exportAudit, isActionPending, activeProjectId } = useWorkbenchStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>审计档案导出</CardTitle>
      </CardHeader>
      <CardBody className="space-y-2">
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" data-testid="export-json" disabled={isActionPending || !activeProjectId} onClick={() => exportAudit('json')}>
            ⬇ JSON（完整）
          </Button>
          <Button size="sm" variant="secondary" data-testid="export-csv" disabled={isActionPending || !activeProjectId} onClick={() => exportAudit('csv')}>
            ⬇ CSV（编码证据清单）
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          JSON 含完整版本链、逐条证据（UTF-16 偏移 + SHA-256）、全部研究决策事件与模型元数据。若项目内存在旧版（legacy）结果，档案头部会标注 <code>legacy: provenance incomplete</code>。导出永不包含 API 密钥。
        </p>
      </CardBody>
    </Card>
  );
};
