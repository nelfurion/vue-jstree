<template>
  <div :class="classes" role="tree" onselectstart="return false">
    <ul :class="containerClasses" role="group">
      <tree-item
        class="tree-item-toplevel"
        v-for="(child, index) in data"
        :key="index"
        :data="child"
        :text-field-name="textFieldName"
        :value-field-name="valueFieldName"
        :children-field-name="childrenFieldName"
        :item-events="itemEvents"
        :whole-row="wholeRow"
        :show-checkbox="showCheckbox"
        :allow-transition="allowTransition"
        :height="sizeHeight"
        :parent-item="data"
        :draggable="draggable"
        :drag-over-background-color="dragOverBackgroundColor"
        :on-item-click="onItemClick"
        :on-item-toggle="onItemToggle"
        :on-item-drag-start="onItemDragStart"
        :on-item-drag-over="onItemDragOver"
        :on-drag-over-open-folder-timeout="onDragOverOpenFolderTimeout"
        :on-item-drag-end="onItemDragEnd"
        :on-item-drop="onItemDrop"
        :klass="index === data.length-1?'tree-last':''"
        :parent-tree-node="null"
      >
        <template slot-scope="_">
          <slot :vm="_.vm" :model="_.model">
            <i :class="_.vm.themeIconClasses" role="presentation" v-if="!_.model.loading"></i>
            <span v-html="_.model[textFieldName]"></span>
          </slot>
        </template>
      </tree-item>
    </ul>
  </div>
</template>
<script lang="js">
import TreeItem from "./tree-item.vue";

let ITEM_ID = 0;
let ITEM_HEIGHT_SMALL = 18;
let ITEM_HEIGHT_DEFAULT = 34;
let ITEM_HEIGHT_LARGE = 32;

export default {
  name: "VJstree",
  props: {
    data: { type: Array },
    size: {
      type: String,
      validator: value => ["large", "small"].indexOf(value) > -1
    },
    showCheckbox: { type: Boolean, default: false },
    wholeRow: { type: Boolean, default: false },
    noDots: { type: Boolean, default: false },
    collapse: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    allowBatch: { type: Boolean, default: false },
    allowTransition: { type: Boolean, default: true },
    textFieldName: { type: String, default: "text" },
    valueFieldName: { type: String, default: "value" },
    childrenFieldName: { type: String, default: "children" },
    itemEvents: {
      type: Object,
      default: function() {
        return {};
      }
    },
    async: { type: Function },
    loadingText: { type: String, default: "Loading..." },
    draggable: { type: Boolean, default: false },
    dragOverBackgroundColor: { type: String, default: "#C9FDC9" },
    onDragOverOpenFolderTimeout: { type: Number, default: 500 },
    klass: String
  },
  data() {
    return {
      draggedItem: undefined,
      draggedElm: undefined
    };
  },
  computed: {
    classes() {
      return [
        { tree: true },
        { "tree-default": !this.size },
        { [`tree-default-${this.size}`]: !!this.size },
        { "tree-checkbox-selection": !!this.showCheckbox },
        { [this.klass]: !!this.klass }
      ];
    },
    containerClasses() {
      return [
        { "tree-container-ul": true },
        { "tree-children": true },
        { "tree-wholerow-ul": !!this.wholeRow },
        { "tree-no-dots": !!this.noDots }
      ];
    },
    sizeHeight() {
      switch (this.size) {
        case "large":
          return ITEM_HEIGHT_LARGE;
        case "small":
          return ITEM_HEIGHT_SMALL;
        default:
          return ITEM_HEIGHT_DEFAULT;
      }
    }
  },
  methods: {
    initializeData(items) {
      if (items && items.length > 0) {
        for (let i in items) {
          var dataItem = this.initializeDataItem(items[i]);
          items[i] = dataItem;
          this.initializeData(items[i][this.childrenFieldName]);
        }
      }
    },
    initializeDataItem(item) {
      function Model(
        item,
        textFieldName,
        valueFieldName,
        childrenFieldName,
        collapse
      ) {
        this.id = item.id || ITEM_ID++;
        this[textFieldName] = item[textFieldName] || "";
        this[valueFieldName] = item[valueFieldName] || item[textFieldName];
        this.icon = item.icon || "";
        this.opened = item.opened || collapse;
        this.selected = item.selected || false;
        this.disabled = item.disabled || false;
        this.loading = item.loading || false;
        this[childrenFieldName] = item[childrenFieldName] || [];
      }

      let node = Object.assign(
        new Model(
          item,
          this.textFieldName,
          this.valueFieldName,
          this.childrenFieldName,
          this.collapse
        ),
        item
      );
      let self = this;
      node.addBefore = function(data, selectedNode) {
        let newItem = self.initializeDataItem(data);
        let index = selectedNode.parentItem.findIndex(t => t.id === node.id);
        selectedNode.parentItem.splice(index, 0, newItem);
      };
      node.addAfter = function(data, selectedNode) {
        let newItem = self.initializeDataItem(data);
        let index =
          selectedNode.parentItem.findIndex(t => t.id === node.id) + 1;
        selectedNode.parentItem.splice(index, 0, newItem);
      };
      node.addChild = function(data) {
        let newItem = self.initializeDataItem(data);
        node.opened = true;
        node[self.childrenFieldName].push(newItem);
      };
      node.openChildren = function() {
        node.opened = true;
        self.handleRecursionNodeChildren(node, node => {
          node.opened = true;
        });
      };
      node.closeChildren = function() {
        node.opened = false;
        self.handleRecursionNodeChildren(node, node => {
          node.opened = false;
        });
      };
      node.removeSelf = function() {

      };
      return node;
    },
    initializeLoading() {
      var item = {};
      item[this.textFieldName] = this.loadingText;
      item.disabled = true;
      item.loading = true;
      return this.initializeDataItem(item);
    },
    handleRecursionNodeChilds(node, func) {
      if (func(node) !== false) {
        if (node.$children && node.$children.length > 0) {
          for (let childNode of node.$children) {
            if (!childNode.disabled) {
              this.handleRecursionNodeChilds(childNode, func);
            }
          }
        }
      }
    },
    handleRecursionNodeChildren(node, func) {
      if (func(node) !== false) {
        if (
          node[this.childrenFieldName] &&
          node[this.childrenFieldName].length > 0
        ) {
          for (let childNode of node[this.childrenFieldName]) {
            this.handleRecursionNodeChildren(childNode, func);
          }
        }
      }
    },
    onItemClick(oriNode, oriItem, e) {
      if (this.multiple) {
        if (this.allowBatch) {
          this.handleBatchSelectItems(oriNode, oriItem);
        }
      } else {
        this.handleSingleSelectItems(oriNode, oriItem);
      }
      this.$emit("item-click", oriNode, oriItem, e);
    },
    handleSingleSelectItems(oriNode, oriItem) {
      this.handleRecursionNodeChilds(this, node => {
        if (node.model) node.model.selected = false;
      });
      oriNode.model.selected = true;
    },
    handleBatchSelectItems(oriNode, oriItem) {
      this.handleRecursionNodeChilds(oriNode, node => {
        if (node.model.disabled) return;
        node.model.selected = oriNode.model.selected;
      });
    },
    onItemToggle(oriNode, oriItem, e) {
      if (oriNode.model.opened) {
        this.handleAsyncLoad(
          oriNode.model[this.childrenFieldName],
          oriNode,
          oriItem
        );
      }
      this.$emit("item-toggle", oriNode, oriItem, e);
    },
    handleAsyncLoad(oriParent, oriNode, oriItem) {
      var self = this;
      if (this.async) {
        if (oriParent[0].loading) {
          this.async(oriNode, data => {
            if (data.length > 0) {
              for (let i in data) {
                if (!data[i].isLeaf) {
                  if (typeof data[i][self.childrenFieldName] !== "object") {
                    data[i][self.childrenFieldName] = [
                      self.initializeLoading()
                    ];
                  }
                }
                var dataItem = self.initializeDataItem(data[i]);
                self.$set(oriParent, i, dataItem);
              }
            } else {
              oriNode.model[self.childrenFieldName] = [];
            }
          });
        }
      }
    },
    onItemDragStart(e, oriNode, oriItem) {
      if (!this.draggable || oriItem.dragDisabled) return false;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text", null);
      this.draggedElm = e.target;
      this.draggedItem = {
        node: oriNode,
        item: oriItem,
        parentItem: oriNode.parentItem,
        index: oriNode.parentItem.findIndex(t => t.id === oriItem.id)
      };

      console.log('EVENT drag Start')
      this.$emit("item-drag-start", oriNode, oriItem, e);
    },
    onItemDragOver(e, target, targetModel) {
      const targetRect = e.target.getBoundingClientRect()
      const { clientX: mouseX, clientY: mouseY } = e

      const nodeHeight = targetRect.bottom - targetRect.top

      const [ xInRect, yInRect ] = [
        mouseX - targetRect.left, 
        mouseY - targetRect.top
      ]

      const oneFourthNodeHeight = nodeHeight / 4
      const positionInTarget = {
        top: yInRect <= oneFourthNodeHeight,
        bottom: yInRect >= (nodeHeight -oneFourthNodeHeight)
      }

      if (this.draggedItem) {
        this.$emit("item-drag-over", {
          target, 
          targetModel, 
          positionInTarget, 
          event: e,
          draggedItem: this.draggedItem.item
        })
      }
    },
    onItemDragEnd(e, oriNode, oriItem) {
      this.draggedItem = undefined;
      this.draggedElm = undefined;
      console.log('EVENT drag End')
      this.$emit("item-drag-end", oriNode, oriItem, e);
    },
    onItemDrop(e, oriNode, oriItem, reorder) {
      console.log('EVENT drag Drop')

      if (!this.draggable || !!oriItem.dropDisabled) {
        return false
      }

      this.$emit(
        "item-drop-before",
        oriNode,
        oriItem,
        !this.draggedItem ? undefined : this.draggedItem.item,
        e
      )

      if (
        !this.draggedElm ||
        this.draggedElm === e.target
      ) {
        return
      }

      if (this.draggedItem) {
        if (
          this.draggedItem.parentItem === oriItem[this.childrenFieldName] ||
          this.draggedItem.item === oriItem ||
          (oriItem[this.childrenFieldName] &&
            oriItem[this.childrenFieldName].findIndex(
              t => t.id === this.draggedItem.item.id
            ) !== -1)
        ) {
          return
        }

        // oriItem is the drop target node's data - addBefore/After are defined here
        // oriNode is the drop target node - node.parentItem is defined here
        // Since dragover reordering works by adding paddings over / under nodes,
        // the target is the node that we want to pass to addBefore/addAfter.
        // The addBefore and addAfter functions seem to be static functions, and
        // there doesn't appear to be any need for them to be called on a specific
        // node.
        if (reorder.before || reorder.after) {
          if (reorder.before) {
            this.$nextTick(() => {
              this.draggedItem.parentItem.splice(this.draggedItem.index, 1)
              oriItem.addBefore(this.draggedItem.item, oriNode)
            })
          } else if (reorder.after) {
            this.$nextTick(() => {
              this.draggedItem.parentItem.splice(this.draggedItem.index, 1)
              oriItem.addAfter(this.draggedItem.item, oriNode)
            })
          }
        } else {
          if (!!oriItem[this.childrenFieldName]) {
            oriItem[this.childrenFieldName].push(this.draggedItem.item)
          } else {
            oriItem[this.childrenFieldName] = [this.draggedItem.item]
          }

          oriItem.opened = true
          var draggedItem = this.draggedItem
          this.$nextTick(() => {
            draggedItem.parentItem.splice(draggedItem.index, 1)
          })

          this.$emit("item-drop", oriNode, oriItem, draggedItem.item, e)
        }
      }
    }
  },
  created() {
    this.initializeData(this.data);
  },
  mounted() {
    if (this.async) {
      this.$set(this.data, 0, this.initializeLoading());
      this.handleAsyncLoad(this.data, this);
    }
  },
  components: {
    TreeItem
  }
};
</script>
<style lang="less">
@import "./less/style";
</style>
