/**
 * 皮肤：Next SEKAI 官方图集（4096²，1347 个精灵）。
 *
 * 精灵表由 `scripts/fetch-assets.mjs` 下载，不进版本库（美术资源不在 MIT 许可内）。
 * 三段切片规则来自图集本身：音符头 = 93 + 168 + 93 = 354 宽、186 高。
 */

export type Sprite = { name: string; x: number; y: number; w: number; h: number }

export class Skin {
  readonly image: HTMLImageElement
  readonly sprites: Map<string, Sprite>
  readonly width: number
  readonly height: number

  private constructor(image: HTMLImageElement, sprites: Map<string, Sprite>, width: number, height: number) {
    this.image = image
    this.sprites = sprites
    this.width = width
    this.height = height
  }

  static async load(base = './assets/'): Promise<Skin> {
    const [table, image] = await Promise.all([
      fetch(`${base}sprites.json`).then((response) => {
        if (!response.ok) throw new Error(`sprites.json → HTTP ${response.status}`)
        return response.json() as Promise<{ width: number; height: number; sprites: Sprite[] }>
      }),
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('skin.png 载入失败'))
        img.src = `${base}skin.png`
      }),
    ])
    const map = new Map<string, Sprite>()
    for (const sprite of table.sprites) map.set(sprite.name, sprite)
    return new Skin(image, map, table.width, table.height)
  }

  has(name: string): boolean {
    return this.sprites.has(name)
  }

  draw(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, w: number, h: number): boolean {
    const sprite = this.sprites.get(name)
    if (!sprite) return false
    ctx.drawImage(this.image, sprite.x, sprite.y, sprite.w, sprite.h, x, y, w, h)
    return true
  }

  /** 水平三段切片：两端按原始比例，中间拉伸。 */
  drawSlice(ctx: CanvasRenderingContext2D, left: string, middle: string, right: string, x: number, y: number, w: number, h: number): boolean {
    const l = this.sprites.get(left)
    const m = this.sprites.get(middle)
    const r = this.sprites.get(right)
    if (!l || !m || !r) return false
    const capLeft = (l.w / l.h) * h
    const capRight = (r.w / r.h) * h
    const middleWidth = Math.max(0, w - capLeft - capRight)
    ctx.drawImage(this.image, l.x, l.y, l.w, l.h, x, y, capLeft, h)
    if (middleWidth > 0) {
      ctx.drawImage(this.image, m.x, m.y, m.w, m.h, x + capLeft, y, middleWidth, h)
    } else {
      // 太窄时按比例压缩两端，避免出现空白
      const total = capLeft + capRight
      const scale = total > 0 ? w / total : 0
      ctx.drawImage(this.image, r.x, r.y, r.w, r.h, x + w - capRight * scale, y, capRight * scale, h)
      return true
    }
    ctx.drawImage(this.image, r.x, r.y, r.w, r.h, x + w - capRight, y, capRight, h)
    return true
  }

  /** 图集里这张贴图的宽高比（用于由宽度推高度）。 */
  aspect(name: string, fallback = 354 / 186): number {
    const sprite = this.sprites.get(name)
    if (!sprite || sprite.h === 0) return fallback
    return sprite.w / sprite.h
  }
}
