import React, { useEffect, useState, useCallback } from "react";
import { Switch, Route, Redirect } from "react-router-dom";

import { ClusterModal } from "components/ClusterModal";
import { MessageBanner } from "components/MessageBanner";
import { Navbar } from "components/Navbar";
import { ClusterStatusBanner } from "components/ClusterStatusButton";
import { SearchBar } from "components/SearchBar";

import { AccountDetailsPage } from "pages/AccountDetailsPage";
import { ClusterStatsPage } from "pages/ClusterStatsPage";
import { SupplyPage } from "pages/SupplyPage";
import { TransactionDetailsPage } from "pages/TransactionDetailsPage";
import { BlockDetailsPage } from "pages/BlockDetailsPage";

const ADDRESS_ALIASES = ["account", "accounts", "addresses"];
const TX_ALIASES = ["txs", "txn", "txns", "transaction", "transactions"];

function App() {
  // 0 -> full page, 1 -> account detail, 2 -> tx detail, 3 -> block detail
  const [viewType, setViewType] = useState<number>(0);
  const [viewAddress, setViewAddress] = useState<string>("");

  const handleMessagesFromExtension = useCallback(
    (event) => {
      console.log(event.data);
      let [vt, va] = event.data.split(":")
      setViewType(parseInt(vt));
      setViewAddress(va);
      console.log(`callback: ${viewType}`);
      console.log(`callback: ${viewAddress}`);
    },
    [viewType, viewAddress]
  );

  useEffect(() => {
    window.addEventListener('message', (event) => {
      handleMessagesFromExtension(event);
    });

    return () => {
      window.removeEventListener('message', handleMessagesFromExtension);
    };
  }, [handleMessagesFromExtension]);

  if (viewType === 0) {
    return (
      <>
        <ClusterModal />
        <div className="main-content">
          <Navbar />
          <MessageBanner />
          <ClusterStatusBanner />
          <SearchBar />
          <Switch>
            <Route exact path={["/supply", "/accounts", "accounts/top"]}>
              <SupplyPage />
            </Route>
            <Route
              exact
              path={TX_ALIASES.map((tx) => `/${tx}/:signature`)}
              render={({ match, location }) => {
                let pathname = `/tx/${match.params.signature}`;
                return <Redirect to={{ ...location, pathname }} />;
              }}
            />
            <Route
              exact
              path={"/tx/:signature"}
              render={({ match }) => (
                <TransactionDetailsPage signature={match.params.signature} />
              )}
            />
            <Route
              exact
              path={["/block/:id", "/block/:id/:tab"]}
              render={({ match }) => (
                <BlockDetailsPage slot={match.params.id} tab={match.params.tab} />
              )}
            />
            <Route
              exact
              path={[
                ...ADDRESS_ALIASES.map((path) => `/${path}/:address`),
                ...ADDRESS_ALIASES.map((path) => `/${path}/:address/:tab`),
              ]}
              render={({ match, location }) => {
                let pathname = `/address/${match.params.address}`;
                if (match.params.tab) {
                  pathname += `/${match.params.tab}`;
                }
                return <Redirect to={{ ...location, pathname }} />;
              }}
            />
            <Route
              exact
              path={["/address/:address", "/address/:address/:tab"]}
              render={({ match }) => (
                <AccountDetailsPage
                  address={match.params.address}
                  tab={match.params.tab}
                />
              )}
            />
            <Route exact path="/">
              <ClusterStatsPage />
            </Route>
            <Route
              render={({ location }) => (
                <Redirect to={{ ...location, pathname: "/" }} />
              )}
            />
          </Switch>
        </div>
      </>
    );
  } else if (viewType === 1) {
    console.log(`render: ${viewType}`);
    console.log(`render: ${viewAddress}`);
    return (<><AccountDetailsPage address={viewAddress} /></>);
  } else if (viewType === 2) {
    console.log(`render: ${viewType}`);
    console.log(`render: ${viewAddress}`);
    return (<><TransactionDetailsPage signature={viewAddress} /></>);
  } else if (viewType === 3) {
    console.log(`render: ${viewType}`);
    console.log(`render: ${viewAddress}`);
    return (<><BlockDetailsPage slot={viewAddress} /></>)
  } else {
    return (<></>);
  }

}

export default App;
