# Shelf

A library for the creation of self extracting shell scripts.

## Why?

It's easier for your users if you distribute a single file, and it's called `install.sh`.

## Usage

```Typescript
# Making a self installing dockerfile
(async () => {
  const output = await makeSelfExtractingScript({
    preExtraction: "echo Installing dockerfile",
    postExtraction: "docker load -i ./image.tar.gz"
  }, [
    "image.tar.gz"
  ]);
})
```

TODO

## How it works

TODO

## Refences

TODO
