# MaskJPG

Alpha PNG → SVG + JPG

## Installation

```
npm i @resolute/maskjpg
```

## Examples

**Simple `<svg>` with base64 encoded JPG**
``` js
const maskjpg = require('@resolute/maskjpg');
const { svg } = await maskjpg('http://pngimg.com/uploads/pancake/pancake_PNG122.png');
```

**Store JPG file and reference in `<svg>`**
``` js
const maskjpg = require('@resolute/maskjpg');
const { svg, jpg } = await maskjpg('./local/path/to/image.png', {
  uri: '/img/image.jpg'
});
fs.promises.writeFile('/docroot/img/image.jpg', jpg);
console.log(svg); // <svg …</svg>
```

## Usage

### `maskjpg`
| Param             | Type                      | Description                                                                |
| ----------------- | ------------------------- | -------------------------------------------------------------------------- |
| **`input`**       | `string` \| `Buffer`      | filename, URL, or Buffer of an alpha PNG                                   |
| `options`         | `object`                  | *optional*                                                                 |
| `options.width`   | `number`                  | Resize width of generated image. Default: `input` image width              |
| `options.quality` | `number`                  | 1-100 qaulity of JPG. Default: **80**                                      |
| `options.uri`     | `string`                  | `string` Web path to JPG or `undefined` base64 encoded data uri (default). |
| `options.attr`    | `{[key: string]: string}` | Attributes to add to `<svg>` tag. Default: none                            |

**Returns**: <code>Promise&lt;{ svg: string, jpg: Buffer }&gt;</code>

**Throws**: If input is invalid.

**Example**
```js
const maskjpg = require('@resolute/maskjpg');
const { 
  svg // <svg> string with base64 encoded JPG
} = await maskjpg('http://pngimg.com/uploads/pancake/pancake_PNG122.png', {
  width: 300,
  quality: 85,
  });
```

## CLI

```
maskjpg http://pngimg.com/uploads/pancake/pancake_PNG122.png > pancake.svg
```
