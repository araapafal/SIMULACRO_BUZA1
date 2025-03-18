const { check } = require('express-validator')
const models = require('../../models')
const Product = models.Product
const Order = models.Order
const Restaurant = models.Restaurant

const checkOrderPending = async (value, { req }) => {
  try {
    const order = await Order.findByPk(req.params.orderId,
      {
        attributes: ['startedAt']
      })
    if (order.startedAt) {
      return Promise.reject(new Error('The order has already been started'))
    } else {
      return Promise.resolve('ok')
    }
  } catch (err) {
    return Promise.reject(err)
  }
}
const checkOrderCanBeSent = async (value, { req }) => {
  try {
    const order = await Order.findByPk(req.params.orderId,
      {
        attributes: ['startedAt', 'sentAt']
      })
    if (!order.startedAt) {
      return Promise.reject(new Error('The order is not started'))
    } else if (order.sentAt) {
      return Promise.reject(new Error('The order has already been sent'))
    } else {
      return Promise.resolve('ok')
    }
  } catch (err) {
    return Promise.reject(err)
  }
}
const checkOrderCanBeDelivered = async (value, { req }) => {
  try {
    const order = await Order.findByPk(req.params.orderId,
      {
        attributes: ['startedAt', 'sentAt', 'deliveredAt']
      })
    if (!order.startedAt) {
      return Promise.reject(new Error('The order is not started'))
    } else if (!order.sentAt) {
      return Promise.reject(new Error('The order is not sent'))
    } else if (order.deliveredAt) {
      return Promise.reject(new Error('The order has already been delivered'))
    } else {
      return Promise.resolve('ok')
    }
  } catch (err) {
    return Promise.reject(err)
  }
}

const checkOrderCanBeDestroyed = async (value, { req }) => {
  try {
    // Buscar el pedido por ID
    const order = await Order.findByPk(req.params.orderId,
      {
        attributes: ['status'] // Asegúrate de que 'status' sea el campo que indica el estado del pedido
      })
    // Verificar si el pedido existe
    if (!order) {
      return Promise.reject(new Error('The order does not exist'))
    }
    // Verificar si el estado es 'pending'
    if (order.status !== 'pending') {
      return Promise.reject(new Error('The order cannot be destroyed because it is not in the pending state'))
    }
    // Si todo está bien, resolver la promesa
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(err)
  }
}

const checkRestaurantExists = async (value, { req }) => {
  try {
    const restaurant = await Restaurant.findByPk(value)
    if (!restaurant) {
      return Promise.reject(new Error('the restaurant does not exists'))
    } else { return Promise.resolve() }
  } catch (err) {
    return Promise.reject(err)
  }
}

const checkProductExists = async (value, { req }) => {
  try {
    const product = await Product.findByPk(value)
    if (!product) {
      return Promise.reject(new Error('the product does not exists'))
    } if (product.available === false) {
      return Promise.reject(new Error('the product is not available'))
    } else { return Promise.resolve() }
  } catch (err) {
    return Promise.reject(err)
  }
}

const checkSameRestaurant = async (value, { req }) => {
  try {
    const resSet = new Set()
    const products = req.body.products
    for (const product of products) {
      const productModel = await Product.findByPk(product.productId)
      resSet.add(productModel.restaurantId)
    }
    if (resSet.size > 1) return Promise.reject(new Error('The products are not all from the same restaurant'))
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(new Error(err))
  }
}

/* ESTE NO ES DEL TODO CORRECTO
const checkSameRestaurant = async (value, { req }) => {
  try {
    const restaurantId = await Restaurant.findByPk(req.body.RestaurantId)
    for (const product of req.body.products) {
      if (product.restaurantId !== restaurantId) {
        return Promise.reject(new Error('the products do not belong to the same restaurant'))
      }
    }
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(err)
  }
} */

module.exports = {

  // TODO: Include validation rules for create that should:
  // 1. Check that restaurantId is present in the body and corresponds to an existing restaurant
  // 2. Check that products is a non-empty array composed of objects with productId and quantity greater than 0
  // 3. Check that products are available
  // 4. Check that all the products belong to the same restaurant
  create: [
    // 1. Check that restaurantId is present in the body and corresponds to an existing restaurant
    check('restaurantId').custom(checkRestaurantExists),
    check('restaurantId').exists().isInt({ min: 1 }).toInt(),
    // 2. Check that products is a non-empty array composed of objects with productId and quantity greater than 0
    check('products').exists().isArray({ min: 1 }), // Compruebo que es una array con más de un componente
    check('products.*.producId').exists().isInt({ min: 1 }).toInt(),
    check('products.*.quantity').isInt({ min: 1 }).toInt(),
    // 3. Check that products are available
    check('products').custom(checkProductExists),
    // 4. Check that all the products belong to the same restaurant
    check('products').custom(checkSameRestaurant),
    // 5. En el test va a dar error por añadir un productId invalido pero también la dirección por lo que tengo que añadir
    check('address').exists().isString().isLength({ min: 1, max: 255 }).trim()

  ],
  // TODO: Include validation rules for update that should:
  // 1. Check that restaurantId is NOT present in the body.
  // 2. Check that products is a non-empty array composed of objects with productId and quantity greater than 0
  // 3. Check that products are available
  // 4. Check that all the products belong to the same restaurant of the originally saved order that is being edited.
  // 5. Check that the order is in the 'pending' state.
  update: [
    // 1. Check that restaurantId is NOT present in the body.
    check('restaurantId').not().exists(),
    // 2. Check that products is a non-empty array composed of objects with productId and quantity greater than 0
    check('products').exists().isArray({ min: 1 }), // Compruebo que es una array con más de un componente
    check('products.*.producId').exists().isInt({ min: 1 }).toInt(),
    check('products.*.quantity').isInt({ min: 1 }).toInt(),
    // 3. Check that products are available
    check('products').custom(checkProductExists),
    // 4. Check that all the products belong to the same restaurant of the originally saved order that is being edited.
    check('products').custom(checkSameRestaurant),
    // 5. Check that the order is in the 'pending' state.
    // No hace falta volver a añadir el isPending porque ya esta en las routes
    // 6. En el test va a dar error por modificar un productId invalido e intentar cambiar la dirección
    check('address').exists().isString().isLength({ min: 1, max: 255 }).trim()
  ],

  // TODO: Include validation rules for destroying an order that should check if the order is in the 'pending' state
  destroy: [
    check('destroyAt').custom(checkOrderCanBeDestroyed)
  ],
  confirm: [
    check('startedAt').custom(checkOrderPending)
  ],
  send: [
    check('sentAt').custom(checkOrderCanBeSent)
  ],
  deliver: [
    check('deliveredAt').custom(checkOrderCanBeDelivered)
  ]
}
