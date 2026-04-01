import { useLoaderData } from "react-router";

import { PreviewProductsPage } from "../components/preview-products-page";
import { previewProductsAction, previewProductsLoader } from "../features/preview-products.server";

export const loader = previewProductsLoader;
export const action = previewProductsAction;

export default function AppIndex() {
  const { products, collectionOptions, filters, setup } = useLoaderData<typeof loader>();

  return (
    <PreviewProductsPage
      products={products}
      collectionOptions={collectionOptions}
      filters={filters}
      isIndexRoute
      setup={setup}
    />
  );
}
