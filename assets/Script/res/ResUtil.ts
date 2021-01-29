import { ResKeeper } from "./ResKeeper";
import { CompletedCallback, ProcessCallback } from "./ResLoader2";
import ResManager from "./ResManager";
/**
 * 资源使用相关工具类
 * 2020-1-18 by 宝爷
 */

function parseDepends(key, parsed: Set<string>) {
    let loader: any = cc.loader;
    var item = loader.getItem(key);
    if (item) {
        var depends = item.dependKeys;
        if (depends) {
            for (var i = 0; i < depends.length; i++) {
                var depend = depends[i];
                if (!parsed.has(depend)) {
                    parsed.add(depend);
                    parseDepends(depend, parsed);
                }
            }
        }
    }
}

function visitAsset(asset, excludeMap: Set<string>) {
    if (!asset._uuid) {
        return;
    }
    let loader: any = cc.loader;
    var key = loader._getReferenceKey(asset);
    if (!excludeMap.has(key)) {
        excludeMap.add(key);
        parseDepends(key, excludeMap);
    }
}

function visitComponent(comp, excludeMap) {
    var props = Object.getOwnPropertyNames(comp);
    for (var i = 0; i < props.length; i++) {
        var value = comp[props[i]];
        if (typeof value === 'object' && value) {
            if (Array.isArray(value)) {
                for (let j = 0; j < value.length; j++) {
                    let val = value[j];
                    if (val instanceof cc.RawAsset) {
                        visitAsset(val, excludeMap);
                    }
                }
            }
            else if (!value.constructor || value.constructor === Object) {
                let keys = Object.getOwnPropertyNames(value);
                for (let j = 0; j < keys.length; j++) {
                    let val = value[keys[j]];
                    if (val instanceof cc.RawAsset) {
                        visitAsset(val, excludeMap);
                    }
                }
            }
            else if (value instanceof cc.RawAsset) {
                visitAsset(value, excludeMap);
            }
        }
    }
}

function visitNode(node, excludeMap) {
    for (let i = 0; i < node._components.length; i++) {
        visitComponent(node._components[i], excludeMap);
    }
    for (let i = 0; i < node._children.length; i++) {
        visitNode(node._children[i], excludeMap);
    }
}

export class ResUtil {
    /**
     * 开始加载资源
     * @param bundle        assetbundle的路径
     * @param url           资源url或url数组
     * @param type          资源类型，默认为null
     * @param onProgess     加载进度回调
     * @param onCompleted   加载完成回调
     */
    public static load(attachNode: cc.Node, url: string, onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, url: string, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, url: string, type: typeof cc.Asset, onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, url: string, type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, url: string[], onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, url: string[], onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, url: string[], type: typeof cc.Asset, onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, url: string[], type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, bundle: string, url: string, onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, bundle: string, url: string, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, bundle: string, url: string, type: typeof cc.Asset, onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, bundle: string, url: string, type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, bundle: string, url: string[], onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, bundle: string, url: string[], onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, bundle: string, url: string[], type: typeof cc.Asset, onCompleted: CompletedCallback);
    public static load(attachNode: cc.Node, bundle: string, url: string[], type: typeof cc.Asset, onProgess: ProcessCallback, onCompleted: CompletedCallback);
    public static load() {
        let attachNode = arguments[0];
        let keeper = ResUtil.getResKeeper(attachNode);
        let newArgs = new Array();
        for (let i = 1; i < arguments.length; ++i) {
            newArgs[i - 1] = arguments[i];
        }
        keeper.load.apply(keeper, newArgs);
    }

    /**
     * 从目标节点或其父节点递归查找一个资源挂载组件
     * @param attachNode 目标节点
     * @param autoCreate 当目标节点找不到ResKeeper时是否自动创建一个
     */
    public static getResKeeper(attachNode: cc.Node, autoCreate?: boolean): ResKeeper {
        if (attachNode) {
            let ret = attachNode.getComponent(ResKeeper);
            if (!ret) {
                if (autoCreate) {
                    return attachNode.addComponent(ResKeeper);
                } else {
                    return ResUtil.getResKeeper(attachNode.parent, autoCreate);
                }
            }
            return ret;
        }
        return ResManager.Instance.getKeeper();
    }

     /**
     * 赋值srcAsset，并使其跟随targetNode自动释放，用法如下
     * mySprite.spriteFrame = AssignWith(otherSpriteFrame, mySpriteNode);
     * @param srcAsset 用于赋值的资源，如cc.SpriteFrame、cc.Texture等等
     * @param targetNode 
     * @param autoCreate 
     */
    public static assignWith(srcAsset: cc.Asset, targetNode: cc.Node, autoCreate?: boolean): any {
        let keeper = ResUtil.getResKeeper(targetNode, autoCreate);
        if (keeper && srcAsset instanceof cc.Asset) {
            keeper.cacheAsset(srcAsset);
            return srcAsset;
        } else {
            console.error(`assignWith ${srcAsset} to ${targetNode} faile`);
            return null;
        }
    }

    /**
     * 实例化一个prefab，并带自动释放功能
     * @param prefab 要实例化的预制
     */
    public static instantiate(prefab: cc.Prefab): cc.Node {
        let node = cc.instantiate(prefab);
        let keeper = ResUtil.getResKeeper(node, true);
        if (keeper) {
            keeper.cacheAsset(prefab);
        }
        return node;
    }

    /**
     * 获取一系列节点依赖的资源
     */
    public static getNodesDepends(nodes: cc.Node[]): Set<string> {
        let ret: Set<string> = new Set<string>();
        for (let i = 0; i < nodes.length; i++) {
            visitNode(nodes[i], ret)
        }
        return ret;
    }
}
