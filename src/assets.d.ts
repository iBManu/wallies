declare module "*.png" {
  const url: string;
  export default url;
}

declare module "*.json?url" {
  const url: string;
  export default url;
}
