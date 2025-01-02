//@ts-check

// https://pnpm.io/pnpmfile
// https://github.com/pnpm/pnpm/issues/4214
// https://github.com/pnpm/pnpm/issues/5391

const rootPkg = require('./package.json');

console.log (`Checking for package peerDependency overrides`);

const remapPeerDependencies = [
  { package: '@solana-program/compute-budget', packageVersion: '0.6.1', peerDependency: '@solana/web3.js', newVersion: '2.0.0' },
  { package: 'lighthouse-sdk', packageVersion: '2.0.1', peerDependency: '@solana/web3.js', newVersion: '2.0.0' },
];

function overridesPeerDependencies(pkg) {
  if (pkg.peerDependencies) {
    remapPeerDependencies.map(dep => {
      if (pkg.name === dep.package && pkg.version.startsWith(dep.packageVersion)) {
        console.log(`  - Checking ${pkg.name}@${pkg.version}`); // , pkg.peerDependencies);

        if (dep.peerDependency in pkg.peerDependencies) {
          try {
            console.log(`    - Overriding ${pkg.name}@${pkg.version} peerDependency ${dep.peerDependency}@${pkg.peerDependencies[dep.peerDependency]}`);

            // First add a new dependency to the package and then remove the peer dependency.
            // This approach has the added advantage that scoped overrides should now work, too.
            pkg.dependencies[dep.peerDependency] = dep.newVersion;
            delete pkg.peerDependencies[dep.peerDependency];

            console.log(`      - Overrode ${pkg.name}@${pkg.version} peerDependency ${dep.peerDependency}@${pkg.dependencies[dep.peerDependency]}`);
          } catch (err) {
            console.error(err);
          }
        }
      }
    });
  }
}

module.exports = {
  hooks: {
    readPackage(pkg, _context) {
      // skipDeps(pkg);
      overridesPeerDependencies(pkg);
      return pkg;
    },
  },
};