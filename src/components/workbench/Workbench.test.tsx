import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EvidenceReview } from './EvidenceReview';
import { DecisionControls } from './DecisionControls';
import { SaturationAssessmentPanel } from './SaturationAssessmentPanel';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import type { WsCode, WsDocument } from '../../utils/workbenchApi';

const DOC_CONTENT = '完整原文内容某处她说最终还是自己扛下来了';

const doc: WsDocument = {
  id: 'd1',
  title: '访谈一',
  createdAt: '2026-10-22T00:00:00.000Z',
  versions: [
    {
      id: 'v1',
      version: 1,
      content: DOC_CONTENT,
      contentHash: 'abcdef1234567890',
      createdAt: '2026-10-22T00:00:00.000Z',
      segments: [],
    },
  ],
};

function assignmentFixture(id: string, quote: string, status = 'suggested') {
  return {
    id,
    evidenceQuote: quote,
    origin: 'ai',
    status,
    rationale: '测试理由',
    originalQuote: null,
    originalRationale: null,
    createdAt: '2026-10-22T00:00:00.000Z',
    updatedAt: '2026-10-22T00:00:00.000Z',
    sourceSegment: {
      id: `seg-${id}`,
      startOffset: 10,
      endOffset: 30,
      text: DOC_CONTENT.slice(10, 30),
      contentHash: 'seg-hash',
      documentVersion: { id: 'v1', version: 1, contentHash: 'abcdef1234567890' },
    },
  };
}

const VERIFIED_QUOTE = '最终还是自己扛下来了';
const UNVERIFIED_QUOTE = '这句并不存在于访谈原文中';

const codes: WsCode[] = [
  {
    id: 'c1',
    label: '尽责劳动叙事',
    definition: null,
    origin: 'ai',
    status: 'suggested',
    createdAt: '2026-10-22T00:00:00.000Z',
    updatedAt: '2026-10-22T00:00:00.000Z',
    assignments: [assignmentFixture('a-ok', VERIFIED_QUOTE), assignmentFixture('a-bad', UNVERIFIED_QUOTE)],
  },
];

describe('EvidenceReview fail-closed rules', () => {
  it('blocks accepting an assignment whose quote no longer verifies against the immutable source', () => {
    render(
      <EvidenceReview codes={codes} documents={[doc]} pending={false} onDecide={vi.fn()} onEdit={vi.fn()} />
    );

    const cards = screen.getAllByTestId('assignment-card');
    expect(cards.length).toBe(2);

    const verifiedCard = cards[0];
    const failedCard = cards[1];
    expect(within(verifiedCard).getByText('✓ 引语已核验')).toBeInTheDocument();
    expect(within(failedCard).getByText('✗ 无法在原文核验')).toBeInTheDocument();
    expect(within(failedCard).getByTestId('evidence-failed')).toBeInTheDocument();
    expect(within(failedCard).getByTestId('accept-button')).toBeDisabled();
    expect(within(failedCard).getByTestId('edit-button')).toBeDisabled();
    // fail-closed still allows explicit research actions
    expect(within(failedCard).getByTestId('reject-button')).toBeEnabled();
  });

  it('dispatches the chosen research decision with the assignment id', async () => {
    const decide = vi.fn();
    render(
      <EvidenceReview codes={codes} documents={[doc]} pending={false} onDecide={decide} onEdit={vi.fn()} />
    );

    await userEvent.click(screen.getAllByTestId('accept-button')[0]);
    expect(decide).toHaveBeenCalledWith('a-ok', 'accept');
  });
});

describe('DecisionControls audit preservation', () => {
  it('keeps the original AI suggestion viewable after an edited finalization', () => {
    const assignment = {
      ...assignmentFixture('a-edited', '研究者改写后的引语', 'edited'),
      originalQuote: 'AI 原始引语：她最终还是自己扛下来了',
      originalRationale: 'AI 原始理由',
    };

    render(
      <DecisionControls
        assignment={assignment as never}
        evidenceVerified
        pending={false}
        onDecide={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByTestId('final-decision')).toBeInTheDocument();
    expect(screen.getByText(/查看保留的 AI 原始建议/)).toBeInTheDocument();
    expect(screen.getByText(/AI 原始引语：她最终还是自己扛下来了/)).toBeInTheDocument();
  });
});

describe('SaturationAssessmentPanel', () => {
  beforeEach(() => {
    useWorkbenchStore.setState({
      activeProjectId: 'p1',
      isActionPending: false,
      error: null,
      overview: { codes: [], memos: [], saturation: null, relationships: [] },
    });
  });

  it('never computes or displays a saturation percentage', () => {
    render(<SaturationAssessmentPanel />);

    expect(screen.getByTestId('no-percent-note')).toBeInTheDocument();
    expect(screen.queryByText(/\d+\s*%/)).toBeNull();
    expect(screen.getByTestId('saturation-save')).toBeDisabled();
  });

  it('saves only what the researcher has decided, with a rationale field', async () => {
    const state = useWorkbenchStore.getState();
    const saveSpy = vi.spyOn(state, 'saveSaturation').mockResolvedValue(undefined);
    useWorkbenchStore.setState({ overview: { codes: [], memos: [], saturation: { scope: 's', decision: '尚未饱和', undecidedQuestions: '', counterexamples: '', rationale: 'r' }, relationships: [] } });

    render(<SaturationAssessmentPanel />);
    await userEvent.click(screen.getByTestId('saturation-save'));

    expect(saveSpy).toHaveBeenCalledTimes(1);
    saveSpy.mockRestore();
  });
});
