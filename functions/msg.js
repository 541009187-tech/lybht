export async function onRequest({env,request}){
  const key="msgboard"
  const cfgKey="msg_config"
  const ADMIN_NAME = "管理员"
  const ADMIN_PWD = "xiaojun99"
  const url = new URL(request.url)

  //========= 修改/读取配置 （用参数区分，不用新路由）=========
  if(url.searchParams.has("getcfg")){
    const raw = await env.MSG.get(cfgKey)
    const cfg = raw ? JSON.parse(raw) : {max:30}
    return Response.json(cfg)
  }
  if(url.searchParams.has("setcfg") && request.method === "PUT"){
    const body = await request.json()
    const {nick,text,max} = body
    if(nick !== ADMIN_NAME || text !== ADMIN_PWD){
      return Response.json({ok:false,msg:"无权限"},{status:403})
    }
    await env.MSG.put(cfgKey,JSON.stringify({max}))
    return Response.json({ok:true})
  }

  //========= 留言基础接口 =========
  if(request.method==="POST"){
    const {c,nick}=await request.json()
    const cfgRaw = await env.MSG.get(cfgKey)
    const cfg = cfgRaw ? JSON.parse(cfgRaw) : {max:30}
    const oldData=await env.MSG.get(key)
    const list=oldData ? JSON.parse(oldData) : []
    list.push({c,t:new Date().toLocaleString(), nick:nick})
    if(list.length > cfg.max) list.shift()
    await env.MSG.put(key,JSON.stringify(list))
    return Response.json({ok:true})
  }else if(request.method==="DELETE"){
    const {idx,nick,text}=await request.json()
    const oldData=await env.MSG.get(key)
    const list=oldData ? JSON.parse(oldData) : []
    const targetMsg = list[idx]
    if(!targetMsg) return Response.json({ok:false,msg:"留言不存在"},{status:400})

    const isAdmin = (nick === ADMIN_NAME) && (text === ADMIN_PWD)
    const isOwner = targetMsg.nick === nick
    if(!isAdmin && !isOwner){
      return Response.json({ok:false,msg:"无权限删除"},{status:403})
    }

    list.splice(idx,1)
    await env.MSG.put(key,JSON.stringify(list))
    return Response.json({ok:true})
  }else{
    const raw=await env.MSG.get(key)
    return Response.json(raw ? JSON.parse(raw) : [])
  }
}
