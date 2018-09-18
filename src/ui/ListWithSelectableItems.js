const React = require('react')
const WithData = require('./WithData')

const ItemSelector = WithData(
  ({ name, id, currentlySelected, dataHandlers, removeItem }) => {
    const selectItem = () => {
      dataHandlers.currentlySelected.set(id)
    }

    const selectedClass = currentlySelected === id ? 'item-selected' : ''

    const removeButton = removeItem ? (
      <div className="remove-item-button" onClick={() => removeItem(id)}>
        X
      </div>
    ) : (
      ''
    )

    return (
      <div onClick={selectItem} className={`item-selector ${selectedClass}`}>
        <div className="item-name">{name}</div>
        {removeButton}
      </div>
    )
  }
)

const ListWithSelectableItemsWithData = WithData(
  ({
    items,
    removeItem,
    passThroughListeners: { selectedItemHandler, itemNameHandlerBuilder }
  }) => {
    return (
      <div className="list-with-selectable-items-wrapper">
        {Object.keys(items || {}).map(itemId => {
          return (
            <ItemSelector
              key={itemId}
              currentlySelected={selectedItemHandler}
              name={itemNameHandlerBuilder(itemId)}
              id={itemId}
              removeItem={removeItem}
            />
          )
        })}
      </div>
    )
  }
)

const ListWithSelectableItems = ({
  items,
  selectedItemHandler,
  itemNameHandlerBuilder,
  removeItem
}) => (
  <ListWithSelectableItemsWithData
    items={items}
    removeItem={removeItem}
    passThroughListeners={{
      selectedItemHandler,
      itemNameHandlerBuilder
    }}
  />
)

module.exports = ListWithSelectableItems
