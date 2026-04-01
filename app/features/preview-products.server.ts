import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";

const PREVIEW_METAFIELD_NAMESPACE = "$app";
const PREVIEW_METAFIELD_KEY = "preview_enabled";
const PREVIEW_METAFIELD_TYPE = "boolean";
const ALL_COLLECTIONS_VALUE = "all";

export type PreviewProduct = {
  id: string;
  title: string;
  enabled: boolean;
  hasMetafield: boolean;
  status: string;
  imageUrl: string | null;
  imageAlt: string | null;
  handle: string;
  collections: Array<{
    id: string;
    title: string;
  }>;
};

export type ProductCollectionOption = {
  label: string;
  value: string;
};

export type PreviewProductsLoaderData = {
  products: PreviewProduct[];
  collectionOptions: ProductCollectionOption[];
  filters: {
    search: string;
    collectionId: string;
  };
  setup: {
    definitionExists: boolean;
    missingMetafieldCount: number;
    missingProductIds: string[];
  };
};

export type PreviewProductsActionData = {
  ok: boolean;
  mode?: "toggle" | "setup";
  productId?: string;
  enabled?: boolean;
  error?: string;
  initializedCount?: number;
  definitionCreated?: boolean;
};

type ProductsQueryResponse = {
  data?: {
    products: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          handle: string;
          status: string;
          collections: {
            edges: Array<{
              node: {
                id: string;
                title: string;
              };
            }>;
          };
          featuredImage: {
            url: string;
            altText: string | null;
          } | null;
          previewEnabled: {
            value: string;
          } | null;
        };
      }>;
    };
    collections: {
      edges: Array<{
        node: {
          id: string;
          title: string;
        };
      }>;
    };
  };
  errors?: Array<{
    message: string;
  }>;
};

type CollectionsQueryResponse = {
  data?: {
    collections: {
      edges: Array<{
        node: {
          id: string;
          title: string;
        };
      }>;
    };
  };
  errors?: Array<{
    message: string;
  }>;
};

type ProductEdge = NonNullable<ProductsQueryResponse["data"]>["products"]["edges"][number];
type CollectionEdge = NonNullable<CollectionsQueryResponse["data"]>["collections"]["edges"][number];

type MetafieldsSetResponse = {
  data?: {
    metafieldsSet?: {
      userErrors: Array<{
        message: string;
      }>;
    };
  };
};

type MetafieldDefinitionQueryResponse = {
  data: {
    metafieldDefinition: {
      id: string;
    } | null;
  };
};

type MetafieldDefinitionCreateResponse = {
  data?: {
    metafieldDefinitionCreate?: {
      createdDefinition?: {
        id: string;
      } | null;
      userErrors: Array<{
        message: string;
      }>;
    };
  };
};

type AdminGraphqlClient = {
  graphql: (
    query: string,
    options?: {
      variables?: Record<string, unknown>;
    },
  ) => Promise<Response>;
};

function normalizeCollectionId(rawValue: string | null) {
  return rawValue && rawValue.length > 0 ? rawValue : ALL_COLLECTIONS_VALUE;
}

async function ensurePreviewMetafieldDefinition(admin: AdminGraphqlClient) {
  const currentDefinitionResponse = await admin.graphql(
    `#graphql
      query PreviewMetafieldDefinition {
        metafieldDefinition(
          identifier: {
            ownerType: PRODUCT
            namespace: "$app"
            key: "preview_enabled"
          }
        ) {
          id
        }
      }
    `,
  );

  const currentDefinitionData =
    (await currentDefinitionResponse.json()) as MetafieldDefinitionQueryResponse;

  if (currentDefinitionData.data.metafieldDefinition) {
    return { ok: true, created: false as const };
  }

  const createDefinitionResponse = await admin.graphql(
    `#graphql
      mutation CreatePreviewMetafieldDefinition {
        metafieldDefinitionCreate(
          definition: {
            name: "Anteprima di stampa attiva"
            description: "Indica se il prodotto ha l'anteprima di stampa abilitata dall'app."
            namespace: "$app"
            key: "preview_enabled"
            type: "boolean"
            ownerType: PRODUCT
            access: { admin: MERCHANT_READ_WRITE }
          }
        ) {
          createdDefinition {
            id
          }
          userErrors {
            message
          }
        }
      }
    `,
  );

  const createDefinitionData =
    (await createDefinitionResponse.json()) as MetafieldDefinitionCreateResponse;
  const definitionErrors =
    createDefinitionData.data?.metafieldDefinitionCreate?.userErrors ?? [];

  if (definitionErrors.length > 0) {
    return {
      ok: false as const,
      error:
        definitionErrors[0]?.message ??
        "Shopify non ha creato la definizione del metafield.",
    };
  }

  return { ok: true, created: true as const };
}

export async function previewProductsLoader({
  request,
}: LoaderFunctionArgs): Promise<PreviewProductsLoaderData> {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const collectionId = normalizeCollectionId(url.searchParams.get("collectionId"));
  let productEdges: ProductEdge[] = [];
  let collectionEdges: CollectionEdge[] = [];
  let definitionExists = false;

  try {
    const productsResponse = await admin.graphql(
      `#graphql
        query PreviewProducts {
          products(first: 100, sortKey: TITLE) {
            edges {
              node {
                id
                title
                handle
                status
                collections(first: 20) {
                  edges {
                    node {
                      id
                      title
                    }
                  }
                }
                featuredImage {
                  url
                  altText
                }
                previewEnabled: metafield(namespace: "$app", key: "preview_enabled") {
                  value
                }
              }
            }
          }
        }
      `,
    );

    const productsData = (await productsResponse.json()) as ProductsQueryResponse;

    if (productsData.errors?.length) {
      console.error("Preview products query failed", productsData.errors);
    }

    productEdges = productsData.data?.products?.edges ?? [];
  } catch (error) {
    console.error("Preview products query crashed", error);
  }

  try {
    const collectionsResponse = await admin.graphql(
      `#graphql
        query PreviewCollections {
          collections(first: 100, sortKey: TITLE) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      `,
    );

    const collectionsData =
      (await collectionsResponse.json()) as CollectionsQueryResponse;

    if (collectionsData.errors?.length) {
      console.error("Preview collections query failed", collectionsData.errors);
    }

    collectionEdges = collectionsData.data?.collections?.edges ?? [];
  } catch (error) {
    console.error("Preview collections query crashed", error);
  }

  try {
    const definitionResult = await ensurePreviewMetafieldDefinition(admin);
    definitionExists = definitionResult.ok;
  } catch (error) {
    console.error("Preview metafield definition check crashed", error);
  }

  const mappedProducts = productEdges.map((edge: ProductEdge) => ({
    id: edge.node.id,
    title: edge.node.title,
    handle: edge.node.handle,
    status: edge.node.status,
    imageUrl: edge.node.featuredImage?.url ?? null,
    imageAlt: edge.node.featuredImage?.altText ?? null,
    enabled: edge.node.previewEnabled?.value === "true",
    hasMetafield: edge.node.previewEnabled !== null,
    collections: (edge.node.collections?.edges ?? []).map((collectionEdge) => ({
      id: collectionEdge.node.id,
      title: collectionEdge.node.title,
    })),
  }));
  const normalizedSearch = search.toLocaleLowerCase();
  const filteredProducts = mappedProducts.filter((product: PreviewProduct) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      product.title.toLocaleLowerCase().includes(normalizedSearch) ||
      product.handle.toLocaleLowerCase().includes(normalizedSearch);

    const matchesCollection =
      collectionId === ALL_COLLECTIONS_VALUE ||
      product.collections.some((collection) => collection.id === collectionId);

    return matchesSearch && matchesCollection;
  });

  const missingProductIds = filteredProducts
    .filter((product: PreviewProduct) => !product.hasMetafield)
    .map((product: PreviewProduct) => product.id);

  return {
    products: filteredProducts,
    collectionOptions: [
      { label: "Tutte le collezioni", value: ALL_COLLECTIONS_VALUE },
      ...collectionEdges.map((edge: CollectionEdge) => ({
        label: edge.node.title,
        value: edge.node.id,
      })),
    ],
    filters: {
      search,
      collectionId,
    },
    setup: {
      definitionExists,
      missingMetafieldCount: missingProductIds.length,
      missingProductIds,
    },
  };
}

export async function previewProductsAction({
  request,
}: ActionFunctionArgs): Promise<PreviewProductsActionData> {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const mode = formData.get("mode");

  if (mode === "setup") {
    const definitionResult = await ensurePreviewMetafieldDefinition(admin);

    if (!definitionResult.ok) {
      return {
        ok: false,
        mode: "setup",
        error: definitionResult.error,
      };
    }

    const productIds = formData
      .getAll("productIds")
      .filter((value): value is string => typeof value === "string" && value.length > 0);

    if (productIds.length === 0) {
      return {
        ok: true,
        mode: "setup",
        initializedCount: 0,
        definitionCreated: definitionResult.created,
      };
    }

    const response = await admin.graphql(
      `#graphql
        mutation InitializePreviewMetafields($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            userErrors {
              message
            }
          }
        }
      `,
      {
        variables: {
          metafields: productIds.map((productId) => ({
            ownerId: productId,
            namespace: PREVIEW_METAFIELD_NAMESPACE,
            key: PREVIEW_METAFIELD_KEY,
            type: PREVIEW_METAFIELD_TYPE,
            value: "false",
          })),
        },
      },
    );

    const data = (await response.json()) as MetafieldsSetResponse;
    const userErrors = data.data?.metafieldsSet?.userErrors ?? [];

    if (userErrors.length > 0) {
      return {
        ok: false,
        mode: "setup",
        error:
          userErrors[0]?.message ??
          "Shopify non ha inizializzato i metafield mancanti.",
      };
    }

    return {
      ok: true,
      mode: "setup",
      initializedCount: productIds.length,
      definitionCreated: definitionResult.created,
    };
  }

  const productId = formData.get("productId");
  const enabled = formData.get("enabled");

  if (typeof productId !== "string" || (enabled !== "true" && enabled !== "false")) {
    return {
      ok: false,
      mode: "toggle",
      productId: typeof productId === "string" ? productId : undefined,
      enabled: enabled === "true",
      error: "Dati non validi per il salvataggio.",
    };
  }

  const definitionResult = await ensurePreviewMetafieldDefinition(admin);

  if (!definitionResult.ok) {
    return {
      ok: false,
      mode: "toggle",
      productId,
      enabled: enabled === "true",
      error: definitionResult.error,
    };
  }

  const response = await admin.graphql(
    `#graphql
      mutation SetPreviewProductMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors {
            message
          }
        }
      }
    `,
    {
      variables: {
        metafields: [
          {
            ownerId: productId,
            namespace: PREVIEW_METAFIELD_NAMESPACE,
            key: PREVIEW_METAFIELD_KEY,
            type: PREVIEW_METAFIELD_TYPE,
            value: enabled,
          },
        ],
      },
    },
  );

  const data = (await response.json()) as MetafieldsSetResponse;
  const userErrors = data.data?.metafieldsSet?.userErrors ?? [];

  if (userErrors.length > 0) {
    return {
      ok: false,
      mode: "toggle",
      productId,
      enabled: enabled === "true",
      error: userErrors[0]?.message ?? "Shopify non ha salvato il metafield.",
    };
  }

  return {
    ok: true,
    mode: "toggle",
    productId,
    enabled: enabled === "true",
    definitionCreated: definitionResult.created,
  };
}
