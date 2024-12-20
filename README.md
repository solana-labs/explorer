<p align="center">
    <img alt="Solana" src="https://i.imgur.com/IKyzQ6T.png" width="250" />
</p>

# Solana Explorer

## Development

Contributing to the Explorer requires `pnpm` version `9.10.0`. 
Once you have this version of `pnpm`, you can continue with the following steps.


-   Copy `.env.example` into `.env` & fill out the fields with custom RPC urls \
    from a Solana RPC provider. You should not use `https://api.mainnet-beta.solana.com` \
    or `https://api.devnet.solana.com` or else you will get rate-limited. These are public \
    endpoints not suitable for application development. You must set these URLs with \
    endpoints from your own provider.

-   `pnpm i` \
    Installs all project dependencies using pnpm package manager. This will create a \
    `node_modules` directory and install all packages specified in `package.json`, \
    including both dependencies and devDependencies.

-   `pnpm dev` \
    Runs the app in the development mode. \
    Open [http://localhost:3000](http://localhost:3000) to view it in the browser. \
    \
    The page will reload if you make edits. \
    You will also see any lint errors in the console.

-   (Optional) `pnpm test` \
    Launches the test runner in the interactive watch mode.<br />

## Troubleshooting

Still can't run the explorer with `pnpm dev`? 
Seeing sass dependency errors?
Make sure you have `pnpm` version `9.10.0`, `git stash` your changes, then blow reset to master with `rm -rf node_modules && git reset --hard HEAD`.
Now running `pnpm i` followed by `pnpm dev` should work. If it is working, don't forget to reapply your changes with `git stash pop`.


# Disclaimer

All claims, content, designs, algorithms, estimates, roadmaps,
specifications, and performance measurements described in this project
are done with the Solana Foundation's ("SF") best efforts. It is up to
the reader to check and validate their accuracy and truthfulness.
Furthermore nothing in this project constitutes a solicitation for
investment.

Any content produced by SF or developer resources that SF provides, are
for educational and inspiration purposes only. SF does not encourage,
induce or sanction the deployment, integration or use of any such
applications (including the code comprising the Solana blockchain
protocol) in violation of applicable laws or regulations and hereby
prohibits any such deployment, integration or use. This includes use of
any such applications by the reader (a) in violation of export control
or sanctions laws of the United States or any other applicable
jurisdiction, (b) if the reader is located in or ordinarily resident in
a country or territory subject to comprehensive sanctions administered
by the U.S. Office of Foreign Assets Control (OFAC), or (c) if the
reader is or is working on behalf of a Specially Designated National
(SDN) or a person subject to similar blocking or denied party
prohibitions.

The reader should be aware that U.S. export control and sanctions laws
prohibit U.S. persons (and other persons that are subject to such laws)
from transacting with persons in certain countries and territories or
that are on the SDN list. As a project based primarily on open-source
software, it is possible that such sanctioned persons may nevertheless
bypass prohibitions, obtain the code comprising the Solana blockchain
protocol (or other project code or applications) and deploy, integrate,
or otherwise use it. Accordingly, there is a risk to individuals that
other persons using the Solana blockchain protocol may be sanctioned
persons and that transactions with such persons would be a violation of
U.S. export controls and sanctions law. This risk applies to
individuals, organizations, and other ecosystem participants that
deploy, integrate, or use the Solana blockchain protocol code directly
(e.g., as a node operator), and individuals that transact on the Solana
blockchain through light clients, third party interfaces, and/or wallet
software.
