const {
  initializeInMemory,
  Hydrator,
  MultiListener
} = require('../../dist/core/goldish')

const initializeFirebase = require('./initialize_firebase')
const InventoryDisplay = require('./inventory_display')
// const seedData = require("./seed_data")
const React = require('react')
const ReactDOM = require('react-dom')
const {
  ShortText,
  TextArea,
  Image,
  Toggle,
  WithData
} = require('../../dist/ui/goldish-ui')

const persistentDataPathMap = {
  currentInventory: 'currentInventory',
  Item: {
    item: 'items/<user id:uid>',
    name: 'items/<user id:uid>/name',
    price: 'items/<id:uid>/price',
    quantity: 'items/<id:uid>/quantity',
    description: 'items/<id:uid>/description',
    imageUrl: 'items/<id:uid>/imageUrl'
  }
}

const db = initializeFirebase(persistentDataPathMap)

window.D = db

const localDataPathMap = {
  selectedItemId: 'selectedItemId',
  shouldAlarmForLowStock: 'shouldAlarmForLowStock'
}

const { dataHandlers: local } = initializeInMemory(localDataPathMap)

const inventoryValueHandler = new Hydrator(
  db.currentInventory(),
  db.Item.item
).map(hydratedValues => {
  return Object.values(hydratedValues).reduce((sum, item) => {
    return sum + (parseInt(item.price * item.quantity) || 0)
  }, 0)
})

const itemQuantitiesHandler = new Hydrator(
  db.currentInventory(),
  db.Item.quantity
)

new MultiListener({
  quantities: itemQuantitiesHandler,
  shouldAlarm: local.shouldAlarmForLowStock()
}).on(({ quantities, shouldAlarm }) => {
  if (shouldAlarm) {
    Object.keys(quantities).forEach(itemId => {
      if (parseInt(quantities[itemId]) < 1) {
        local.selectedItemId().set(itemId)
      }
    })
  }
})

const BigItemDisplay = WithData(({ selectedItemId }) => {
  if (!selectedItemId) {
    return <div />
  }

  return (
    <div>
      <div>
        <Image src={db.Item.imageUrl(local.selectedItemId())} />
      </div>
      <div>
        <TextArea
          updateOnShiftEnter
          text={db.Item.name(local.selectedItemId())}
        />
      </div>
      <div>
        <ShortText text={db.Item.description(local.selectedItemId())} />
      </div>
      <div>
        Price: <ShortText text={db.Item.price(local.selectedItemId())} />
      </div>
      <div>
        Quantity: <ShortText text={db.Item.quantity(local.selectedItemId())} />
      </div>
    </div>
  )
})

const Topbar = () => {
  return (
    <div className="topbar">
      <div className="topbar-item">
        Inventory Value: <ShortText text={inventoryValueHandler} />
      </div>
      <div className="topbar-item">
        Low Stock Alarm?
        <Toggle
          onText="Alarm on"
          offText="Alarm Off"
          state={local.shouldAlarmForLowStock()}
        />
      </div>
    </div>
  )
}

ReactDOM.render(
  <BigItemDisplay selectedItemId={local.selectedItemId()} />,
  document.getElementById('more-info-root')
)

ReactDOM.render(<Topbar />, document.getElementById('topbar-root'))

ReactDOM.render(
  <InventoryDisplay db={db} local={local} />,
  document.getElementById('inventory-root')
)
