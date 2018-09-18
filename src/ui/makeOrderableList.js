const DragSource = require('react-dnd').DragSource
const DropTarget = require('react-dnd').DropTarget
const HTML5Backend = require('react-dnd-html5-backend')
const DragDropContext = require('react-dnd').DragDropContext
const findDOMNode = require('react-dom').findDOMNode
const React = require('react')

const makeOrderableList = (indexHandler, ChildItemComponent, opts) => {
  const { itemWrapperClass, listClass } = opts

  const source = {
    beginDrag(props) {
      return {
        id: props.id,
        index: props.index,
        move: newIndex => {
          props.updateLocalOrdering(props.id, newIndex)
        }
      }
    }
  }

  const target = {
    hover(props, monitor, component) {
      const draggedItem = monitor.getItem()
      const dragIndex = draggedItem.index
      const moveFunc = draggedItem.move

      const hoverIndex = props.index

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return
      }

      // Determine rectangle on screen
      const hoverBoundingRect = findDOMNode(component).getBoundingClientRect()

      const clientOffset = monitor.getClientOffset()

      const hoverHalfX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2

      // Get pixels to the left
      const pixelsToLeft = clientOffset.x - hoverBoundingRect.left

      const hoverHalfY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

      // Get pixels to the top
      const pixelsToTop = clientOffset.y - hoverBoundingRect.top

      // moving to the left or up
      // moving to the right or down

      if (
        (dragIndex > hoverIndex &&
          (pixelsToLeft < hoverHalfX || pixelsToTop > hoverHalfY)) ||
        (dragIndex < hoverIndex &&
          (pixelsToLeft > hoverHalfX || pixelsToTop < hoverHalfY))
      ) {
        moveFunc(hoverIndex)
        monitor.getItem().index = hoverIndex
      }
    },

    drop(props, monitor) {
      props.updateRemoteSourceOrder()
    }
  }

  /**
   * Specifies the props to inject into your component.
   */
  function collectSource(connect, monitor) {
    return {
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging()
    }
  }

  function collectTarget(connect, monitor) {
    return {
      connectDropTarget: connect.dropTarget(),
      isOver: monitor.isOver()
    }
  }

  const OrderableItem = ({
    id,
    connectDragSource,
    connectDropTarget,
    isDragging,
    passThroughProps
  }) => {
    return connectDragSource(
      connectDropTarget(
        <div
          style={isDragging ? { opacity: 0.5 } : null}
          className={itemWrapperClass}
        >
          <ChildItemComponent {...passThroughProps} id={id} />
        </div>
      )
    )
  }

  const DragAndDroppableItem = DropTarget('item', target, collectTarget)(
    DragSource('item', source, collectSource)(OrderableItem)
  )

  class DragAndDropList extends React.Component {
    render() {
      const itemMap = this.props.itemIds || {}
      const itemIdList = Object.keys(itemMap)
      const updateLocalOrdering = this.props.updateLocalOrdering
      const updateRemoteSourceOrder = this.props.updateRemoteSourceOrder
      const passThroughProps = this.props.passThroughProps

      itemIdList.sort((a, b) => itemMap[a].index - itemMap[b].index)

      return (
        <div className={`orderable-list-display ${listClass}`}>
          {itemIdList.map((id, index) => (
            <DragAndDroppableItem
              key={id}
              id={id}
              index={index}
              updateLocalOrdering={updateLocalOrdering}
              updateRemoteSourceOrder={updateRemoteSourceOrder}
              passThroughProps={passThroughProps}
            />
          ))}
        </div>
      )
    }
  }

  class OrdererableList extends React.Component {
    constructor(props) {
      super(props)
      this.state = { localOrdering: {} }
    }

    componentDidMount() {
      this.offIndex = indexHandler.on(remoteIndex => {
        this.setState({ localOrdering: remoteIndex })
      })
    }

    componentWillUnmount() {
      this.offIndex && this.offIndex()
    }

    render() {
      const { localOrdering } = this.state

      const updateLocalOrdering = (changedId, newIndex) => {
        const currentOrdering = Object.keys(localOrdering)

        currentOrdering.sort(
          (a, b) =>
            (localOrdering[a].index || 0) - (localOrdering[b].index || 0)
        )

        const oldIndex = currentOrdering.indexOf(changedId)

        currentOrdering.splice(
          newIndex,
          0,
          currentOrdering.splice(oldIndex, 1)[0]
        )

        currentOrdering.forEach((id, i) => {
          const item = localOrdering[id]
          const obj = typeof item !== 'object' ? {} : item
          localOrdering[id] = obj
          localOrdering[id].index = i
        })

        this.setState({ localOrdering })
      }

      const updateRemoteSourceOrder = () => {
        indexHandler.set(localOrdering)
      }

      return (
        <DragAndDropList
          itemIds={localOrdering}
          updateLocalOrdering={updateLocalOrdering}
          updateRemoteSourceOrder={updateRemoteSourceOrder}
          passThroughProps={this.props}
        />
      )
    }
  }

  window._cachedDragAndDropHTML5Backend =
    window._cachedDragAndDropHTML5Backend || DragDropContext(HTML5Backend)

  return window._cachedDragAndDropHTML5Backend(OrdererableList)
}

module.exports = makeOrderableList
