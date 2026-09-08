import { locatePullRequest } from '../build-info-locate-pr.mjs';

const RUN = {
    head_branch: 'feat/thing',
    head_repository: { full_name: 'hoodieshq/explorer' },
    head_sha: 'abc123',
    id: 42,
};

const PR = {
    head: { ref: 'feat/thing', repo: { full_name: 'hoodieshq/explorer' }, sha: 'abc123' },
    number: 77,
    state: 'open',
};

function harness({ artifacts = [{ name: 'build-info-comment' }], prs = [PR] } = {}) {
    const outputs: Record<string, string> = {};
    const infos: string[] = [];
    return {
        args: {
            context: { payload: { workflow_run: RUN }, repo: { owner: 'solana-foundation', repo: 'explorer' } },
            core: {
                info: (message: string) => infos.push(message),
                setOutput: (name: string, value: string) => {
                    outputs[name] = value;
                },
            },
            github: {
                rest: {
                    actions: { listWorkflowRunArtifacts: async () => ({ data: { artifacts } }) },
                    repos: { listPullRequestsAssociatedWithCommit: async () => ({ data: prs }) },
                },
            },
        },
        infos,
        outputs,
    };
}

describe('locatePullRequest', () => {
    it('should output the PR number when an open PR matches the run head exactly', async () => {
        const { args, outputs } = harness();
        await locatePullRequest(args);
        expect(outputs).toEqual({ found: 'true', pr: '77' });
    });

    it('should skip when the report artifact is missing', async () => {
        const { args, outputs, infos } = harness({ artifacts: [{ name: 'other' }] });
        await locatePullRequest(args);
        expect(outputs).toEqual({});
        expect(infos[0]).toContain('No bundle report artifact');
    });

    it('should skip a PR whose head moved past the run head', async () => {
        const { args, outputs } = harness({ prs: [{ ...PR, head: { ...PR.head, sha: 'newer' } }] });
        await locatePullRequest(args);
        expect(outputs).toEqual({});
    });

    it('should skip a closed PR', async () => {
        const { args, outputs } = harness({ prs: [{ ...PR, state: 'closed' }] });
        await locatePullRequest(args);
        expect(outputs).toEqual({});
    });

    it('should skip a stacked-branch PR from a different head branch', async () => {
        const { args, outputs } = harness({ prs: [{ ...PR, head: { ...PR.head, ref: 'other-branch' } }] });
        await locatePullRequest(args);
        expect(outputs).toEqual({});
    });

    it('should skip a PR from a different head repository', async () => {
        const { args, outputs } = harness({
            prs: [{ ...PR, head: { ...PR.head, repo: { full_name: 'someone/explorer' } } }],
        });
        await locatePullRequest(args);
        expect(outputs).toEqual({});
    });
});
