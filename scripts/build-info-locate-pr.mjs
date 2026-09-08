// Locates the bundle report artifact and target PR for a completed CI run; used by
// .github/workflows/build-info-comment.yaml via actions/github-script.
export async function locatePullRequest({ github, context, core }) {
    const run = context.payload.workflow_run;
    const {
        data: { artifacts },
    } = await github.rest.actions.listWorkflowRunArtifacts({ ...context.repo, run_id: run.id });
    if (!artifacts.some(artifact => artifact.name === 'build-info-comment')) {
        return core.info('No bundle report artifact on this run; skipping.');
    }

    const { data: prs } = await github.rest.repos.listPullRequestsAssociatedWithCommit({
        ...context.repo,
        commit_sha: run.head_sha,
    });
    // Strict match: the endpoint returns every PR containing the commit, so an open PR on a stacked
    // branch could steal the comment, and a rerun for a superseded head could overwrite the current
    // report with stale data.
    const pr = prs.find(
        pr =>
            pr.state === 'open' &&
            pr.head.sha === run.head_sha &&
            pr.head.ref === run.head_branch &&
            pr.head.repo?.full_name === run.head_repository?.full_name,
    );
    if (!pr) {
        return core.info("No open pull request has this run's head as its current head; skipping.");
    }

    core.setOutput('found', 'true');
    core.setOutput('pr', String(pr.number));
}
