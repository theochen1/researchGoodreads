import { requirePageUser } from "@/lib/server/page-auth";
import { ExtensionConnectClient } from "./extension-connect-client";

export const dynamic = "force-dynamic";

export default async function ExtensionConnectPage() {
  await requirePageUser();

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Connect Extension</h1>
        </div>
      </header>
      <ExtensionConnectClient />
    </>
  );
}
