export type AuditAction =
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_PUBLISHED'
  | 'PRODUCT_UNPUBLISHED'
  | 'PRODUCT_HIDDEN'
  | 'PRODUCT_PUBLISHED_WHILE_OUT_OF_STOCK'  // Producto publicado sin stock
  | 'STOCK_ADJUSTED'
  | 'IMAGE_ADDED'
  | 'IMAGE_REMOVED'
  | 'IMAGE_SET_PRIMARY'
  | 'IMAGE_LIMIT_REACHED'
  | 'IMAGE_UPLOADED'
  | 'IMAGE_UPLOAD_FAILED'
  | 'PRODUCT_DELETED'
  | 'PRODUCT_ARCHIVED'
  | 'PRODUCT_RESTORED'
  | 'PRODUCT_CLONED'
  | 'BULK_STATUS_CHANGED'
  | 'BULK_PRODUCT_PUBLISHED'
  | 'BULK_PRODUCT_HIDDEN'
  | 'PRODUCT_PUBLISH_BLOCKED'
  | 'BULK_ARCHIVED'
  | 'CSV_EXPORTED'
  | 'VARIANT_ADDED'
  | 'VARIANT_REMOVED'
  | 'VARIANT_STOCK_ADJUSTED'
  | 'VARIANTS_GENERATED'
  | 'PRODUCT_VARIANTS_TOGGLED'
  | 'CATEGORY_CREATED'
  | 'CATEGORY_UPDATED'
  | 'CATEGORY_ARCHIVED'
  | 'CATEGORY_RESTORED'
  | 'PROMO_CREATED'
  | 'PROMO_UPDATED'
  | 'PROMO_TOGGLED'
  | 'PROMO_DELETED'
  | 'COUPON_CREATED'
  | 'COUPON_UPDATED'
  | 'COUPON_TOGGLED'
  | 'COUPON_DELETED'
  | 'COUPON_RESET_USEDCOUNT'
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_ITEM_ADDED'
  | 'ORDER_ITEM_REMOVED'
  | 'INVENTORY_DECREMENTED'
  | 'INVENTORY_RESTOCKED'
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_UPDATED'
  | 'CUSTOMER_TAGS_CHANGED'
  | 'CUSTOMER_NOTES_UPDATED'
  | 'PRODUCT_COST_UPDATED'        // Costo de producto actualizado
  | 'VARIANT_COST_UPDATED'         // Costo de variante actualizado
  | 'ORDER_SOLD_BELOW_COST'        // Warning: venta por debajo del costo
  | 'RMA_CREATED'                  // RMA creado
  | 'RMA_UPDATED'                  // RMA actualizado
  | 'RMA_STATUS_CHANGED'           // Estado de RMA cambiado
  | 'RMA_COMPLETED'                // RMA completado (inventario aplicado)
  | 'RMA_CANCELLED'                // RMA cancelado
  | 'RMA_REVERTED'                 // Inventario de RMA revertido
  | 'INVENTORY_RESTOCKED_FROM_RETURN' // Inventario repuesto por devolución
  | 'INVENTORY_DECREMENTED_FOR_EXCHANGE' // Inventario decrementado por cambio
  | 'USER_CREATED'                 // Usuario creado
  | 'USER_UPDATED'                 // Usuario actualizado
  | 'USER_SUSPENDED'               // Usuario suspendido
  | 'USER_ACTIVATED'               // Usuario activado
  | 'ROLE_CREATED'                 // Rol creado
  | 'ROLE_UPDATED'                 // Rol actualizado
  | 'ROLE_DELETED'                 // Rol eliminado
  | 'ROLE_CLONED'                  // Rol clonado/duplicado
  | 'CURRENT_USER_SWITCHED'        // Usuario activo cambiado (simulación)
  | 'COVERAGE_ZIP_CREATED'         // CP agregado a cobertura
  | 'COVERAGE_ZIP_UPDATED'         // CP de cobertura actualizado
  | 'COVERAGE_ZIP_STATUS_CHANGED'  // Estado de CP cambiado
  | 'COVERAGE_ZIP_DELETED'         // CP eliminado de cobertura
  | 'COVERAGE_IMPORT'              // Importación masiva de CPs
  | 'COVERAGE_EXPORT'              // Exportación de CPs
  | 'ORDER_REVIEW_FLAGGED'         // Pedido marcado para revisión manual
  | 'ORDER_REVIEW_APPROVED'        // Pedido en zona de revisión aprobado
  | 'ORDER_REVIEW_REJECTED'        // Pedido en zona de revisión rechazado
  | 'AUTH_LOGIN_SUCCESS'           // Login exitoso
  | 'AUTH_LOGIN_FAILED'            // Login fallido
  | 'AUTH_LOGOUT'                  // Logout
  | 'AUDIT_PURGED'                 // Eventos de auditoría purgados
  | 'REPORT_EXPORTED';             // Reporte exportado

// Entity type for audit events (more specific)
export type AuditEntityType = 
  | 'coverageZip'
  | 'order'
  | 'customer'
  | 'product'
  | 'products'
  | 'category'
  | 'rma'
  | 'role'
  | 'user'
  | 'promotion'
  | 'coupon'
  | 'image';

export interface AuditEntity {
  type: AuditEntityType;
  id: string;
  label: string; // Human-readable label (e.g., "CP 03100", "ORD-000123")
}

export interface AuditChange {
  field: string;
  from?: any;
  to?: any;
}

export interface AuditEvent {
  id: string;
  ts: string; // ISO timestamp
  actor: {
    id: string;
    name: string;
    roleName?: string;
  };
  action: AuditAction;
  entity?: AuditEntity;
  changes?: AuditChange[];
  metadata?: Record<string, any>;
}

// Human-readable labels for all actions
export const ACTION_LABELS: Record<AuditAction, string> = {
  PRODUCT_CREATED: 'Producto creado',
  PRODUCT_UPDATED: 'Producto actualizado',
  PRODUCT_PUBLISHED: 'Producto publicado',
  PRODUCT_UNPUBLISHED: 'Producto despublicado',
  PRODUCT_HIDDEN: 'Producto oculto',
  PRODUCT_PUBLISHED_WHILE_OUT_OF_STOCK: 'Producto publicado sin stock',
  STOCK_ADJUSTED: 'Stock ajustado',
  IMAGE_ADDED: 'Imagen agregada',
  IMAGE_REMOVED: 'Imagen eliminada',
  IMAGE_SET_PRIMARY: 'Imagen principal configurada',
  IMAGE_LIMIT_REACHED: 'Límite de imágenes alcanzado',
  IMAGE_UPLOADED: 'Imagen subida',
  IMAGE_UPLOAD_FAILED: 'Error al subir imagen',
  PRODUCT_DELETED: 'Producto eliminado',
  PRODUCT_ARCHIVED: 'Producto archivado',
  PRODUCT_RESTORED: 'Producto restaurado',
  PRODUCT_CLONED: 'Producto clonado',
  BULK_STATUS_CHANGED: 'Estado cambiado en lote',
  BULK_PRODUCT_PUBLISHED: 'Productos publicados en lote',
  BULK_PRODUCT_HIDDEN: 'Productos ocultados en lote',
  PRODUCT_PUBLISH_BLOCKED: 'Publicación de productos bloqueada',
  BULK_ARCHIVED: 'Productos archivados en lote',
  CSV_EXPORTED: 'Exportado a CSV',
  VARIANT_ADDED: 'Variante agregada',
  VARIANT_REMOVED: 'Variante eliminada',
  VARIANT_STOCK_ADJUSTED: 'Stock de variante ajustado',
  VARIANTS_GENERATED: 'Variantes generadas',
  PRODUCT_VARIANTS_TOGGLED: 'Sistema de variantes activado/desactivado',
  CATEGORY_CREATED: 'Categoría creada',
  CATEGORY_UPDATED: 'Categoría actualizada',
  CATEGORY_ARCHIVED: 'Categoría archivada',
  CATEGORY_RESTORED: 'Categoría restaurada',
  PROMO_CREATED: 'Promoción creada',
  PROMO_UPDATED: 'Promoción actualizada',
  PROMO_TOGGLED: 'Promoción activada/desactivada',
  PROMO_DELETED: 'Promoción eliminada',
  COUPON_CREATED: 'Cupón creado',
  COUPON_UPDATED: 'Cupón actualizado',
  COUPON_TOGGLED: 'Cupón activado/desactivado',
  COUPON_DELETED: 'Cupón eliminado',
  COUPON_RESET_USEDCOUNT: 'Contador de uso de cupón reiniciado',
  ORDER_CREATED: 'Pedido creado',
  ORDER_STATUS_CHANGED: 'Estado de pedido cambiado',
  ORDER_ITEM_ADDED: 'Artículo agregado al pedido',
  ORDER_ITEM_REMOVED: 'Artículo eliminado del pedido',
  INVENTORY_DECREMENTED: 'Inventario decrementado',
  INVENTORY_RESTOCKED: 'Inventario repuesto',
  CUSTOMER_CREATED: 'Cliente creado',
  CUSTOMER_UPDATED: 'Cliente actualizado',
  CUSTOMER_TAGS_CHANGED: 'Etiquetas de cliente cambiadas',
  CUSTOMER_NOTES_UPDATED: 'Notas de cliente actualizadas',
  PRODUCT_COST_UPDATED: 'Costo de producto actualizado',
  VARIANT_COST_UPDATED: 'Costo de variante actualizado',
  ORDER_SOLD_BELOW_COST: 'Venta por debajo del costo',
  RMA_CREATED: 'RMA creado',
  RMA_UPDATED: 'RMA actualizado',
  RMA_STATUS_CHANGED: 'Estado de RMA cambiado',
  RMA_COMPLETED: 'RMA completado',
  RMA_CANCELLED: 'RMA cancelado',
  RMA_REVERTED: 'Inventario de RMA revertido',
  INVENTORY_RESTOCKED_FROM_RETURN: 'Inventario repuesto por devolución',
  INVENTORY_DECREMENTED_FOR_EXCHANGE: 'Inventario decrementado por cambio',
  USER_CREATED: 'Usuario creado',
  USER_UPDATED: 'Usuario actualizado',
  USER_SUSPENDED: 'Usuario suspendido',
  USER_ACTIVATED: 'Usuario activado',
  ROLE_CREATED: 'Rol creado',
  ROLE_UPDATED: 'Rol actualizado',
  ROLE_DELETED: 'Rol eliminado',
  ROLE_CLONED: 'Rol clonado',
  CURRENT_USER_SWITCHED: 'Usuario actual cambiado',
  COVERAGE_ZIP_CREATED: 'CP agregado a cobertura',
  COVERAGE_ZIP_UPDATED: 'CP de cobertura actualizado',
  COVERAGE_ZIP_STATUS_CHANGED: 'Estado de CP cambiado',
  COVERAGE_ZIP_DELETED: 'CP eliminado de cobertura',
  COVERAGE_IMPORT: 'Importación masiva de CPs',
  COVERAGE_EXPORT: 'Exportación de CPs',
  ORDER_REVIEW_FLAGGED: 'Pedido marcado para revisión manual',
  ORDER_REVIEW_APPROVED: 'Pedido en zona de revisión aprobado',
  ORDER_REVIEW_REJECTED: 'Pedido en zona de revisión rechazado',
  AUTH_LOGIN_SUCCESS: 'Login exitoso',
  AUTH_LOGIN_FAILED: 'Login fallido',
  AUTH_LOGOUT: 'Logout',
  AUDIT_PURGED: 'Eventos de auditoría purgados',
  REPORT_EXPORTED: 'Reporte exportado',
};