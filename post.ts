// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import PostM, { SchemaI } from "../../models/Post"
import { withIronSession } from "next-iron-session"
import { sessionOptions } from "../../components/session"

type ResI = { type: "echo" | "error" }

interface SchemaIdI extends SchemaI {
  _id: string
}

abstract class Rest<Req> {
  protected checkKeys: (keyof SchemaI)[] = [
    "name",
    "image0",
    "image1",
    "description",
  ]

  constructor(protected req: { body: Req }, protected res) {}

  protected isString(v: any): boolean {
    return v !== undefined && typeof v === "string" ? true : false
  }

  protected filter(string: string): string {
    return string.replace(/[\[\]\{\}<>]/gim, "")
  }

  /** ### OK */
  protected status200(param: Object) {
    this.res.status(200).json({ ...param, type: "echo" } as ResI)
  }

  /** ### Created / Updated / Deleted */
  protected status201(param: Object) {
    this.res.status(201).json({ ...param, type: "echo" } as ResI)
  }

  /** ### Invalid parameters */
  protected status400() {
    this.res
      .status(400)
      .json({ type: "error", description: "Invalid parameters" } as ResI)
  }

  /** ### Error DB */
  protected status424(err: string) {
    this.res
      .status(424)
      .json({ type: "error", description: "Error DB", text: err } as ResI)
  }
}

class Get<Req extends {}> extends Rest<Req> {
  constructor(req: { body: Req }, res) {
    super(req, res)
    this.getPosts()
  }

  private async getPosts() {
    try {
      const posts = await PostM.find(/* { code: "asdf" } */)
      this.status200({ description: "GET", collection: posts })
    } catch (e) {
      this.status424(e)
    }
  }
}

class Post<Req extends SchemaI> extends Rest<Req> {
  constructor(req: { body: Req }, res) {
    super(req, res)
    if (
      this.checkKeys.map((v) => this.isString(this.param[v])).indexOf(false) ===
      -1
    ) {
      this.addPost()
    } else {
      this.status400()
    }
  }

  private get param(): SchemaI {
    return {
      name:
        this.req.body.name !== undefined
          ? this.filter(this.req.body.name as string)
          : "",
      category:
        this.req.body.category !== undefined
          ? this.filter(this.req.body.category as string)
          : "",
      image0:
        this.req.body.image0 !== undefined
          ? this.filter(this.req.body.image0 as string)
          : "",
      image1:
        this.req.body.image1 !== undefined
          ? this.filter(this.req.body.image1 as string)
          : "",
      description:
        this.req.body.name !== undefined
          ? this.filter(this.req.body.description as string)
          : "",
    }
  }

  private async addPost() {
    try {
      const post = new PostM(this.param)
      await post.save()
      this.status201({ description: "Post added to DB" })
    } catch (e) {
      this.status424(e)
    }
  }
}

class Put<Req extends SchemaIdI> extends Rest<Req> {
  constructor(req: { body: Req }, res) {
    super(req, res)
    if (
      ["_id", ...this.checkKeys]
        .map((v) => this.isString(this.param[v]))
        .indexOf(false) === -1
    ) {
      this.updatePost()
    } else {
      this.status400()
    }
  }

  private get param(): SchemaIdI {
    return {
      _id:
        this.req.body._id !== undefined
          ? this.filter(this.req.body._id as string)
          : "",
      name:
        this.req.body.name !== undefined
          ? this.filter(this.req.body.name as string)
          : "",
      category:
        this.req.body.category !== undefined
          ? this.filter(this.req.body.category as string)
          : "",
      image0:
        this.req.body.image0 !== undefined
          ? this.filter(this.req.body.image0 as string)
          : "",
      image1:
        this.req.body.image1 !== undefined
          ? this.filter(this.req.body.image1 as string)
          : "",
      description:
        this.req.body.name !== undefined
          ? this.filter(this.req.body.description as string)
          : "",
    }
  }

  private get id(): string {
    return this.req.body._id !== undefined
      ? this.filter(this.req.body._id as string)
      : ""
  }

  private updatePost() {
    try {
      PostM.updateOne({ _id: this.id }, this.param, (err, res) => {
        if (err) this.status424(err)
        this.status201({ description: "Successful change" })
      })
    } catch (err) {
      this.status424(err)
    }
  }
}

class Delete<Req extends { _id: string }> extends Rest<Req> {
  constructor(req: { body: Req }, res) {
    super(req, res)
    if (this.isString(this.id)) {
      this.deletePost()
    } else {
      this.status400()
    }
  }

  private get id() {
    return this.req.body._id !== undefined
      ? this.filter(this.req.body._id as string)
      : ""
  }

  private async deletePost() {
    try {
      PostM.deleteOne({ _id: this.id }, (err) => {
        if (err) this.status424(err)
        this.status201({ description: "Successful deletion" })
      })
    } catch (err) {
      this.status424(err)
    }
  }
}

export default withIronSession(async (req, res) => {
  const checkUser = req.session.get("user") !== undefined ? true : false

  req.method === "POST" && checkUser
    ? new Post(req as { body: SchemaI }, res)
    : req.method === "PUT" && checkUser
    ? new Put(req as { body: SchemaIdI }, res)
    : req.method === "DELETE" && checkUser
    ? new Delete(req as { body: { _id: string } }, res)
    : new Get(req as { body: {} }, res)
}, sessionOptions)
