package com.cimco.api.service;

import com.cimco.api.model.Usuario;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

/**
 * Servicio para la gestión de usuarios (Conductores y Clientes).
 * Implementa la lógica de negocio para la Wallet y transacciones de CIMCO.
 */
@Service
public class UsuarioService {

    @Autowired
    private FirebaseService firebaseService;

    private static final String COLLECTION_NAME = "usuarios";
    private static final String WALLET_FIELD = "saldo_wallet"; 
    private static final double COMISION_PORCENTAJE = 0.10; // 10% de comisión configurable

    /**
     * Obtiene la instancia de Firestore desde el servicio central de Firebase.
     */
    private Firestore getDb() {
        return firebaseService.getFirestore();
    }

    /**
     * LÓGICA DE COMISIÓN (10%): 
     * Se ejecuta al finalizar un viaje para descontar la comisión del conductor.
     * Utiliza transacciones para garantizar la integridad de los datos.
     */
    public String descontarComision(String conductorId, double tarifaViaje) throws ExecutionException, InterruptedException {
        Firestore db = getDb();
        DocumentReference docRef = db.collection(COLLECTION_NAME).document(conductorId);
        
        ApiFuture<String> transaction = db.runTransaction(t -> {
            DocumentSnapshot snapshot = t.get(docRef).get();
            
            if (!snapshot.exists()) {
                throw new RuntimeException("Error: El conductor con ID " + conductorId + " no existe.");
            }

            // Recuperar el saldo actual de forma segura
            Double saldoActual = snapshot.getDouble(WALLET_FIELD);
            if (saldoActual == null) saldoActual = 0.0;

            // Cálculo de la comisión
            double comision = tarifaViaje * COMISION_PORCENTAJE;
            
            if (saldoActual < comision) {
                throw new RuntimeException("SALDO INSUFICIENTE: El conductor requiere $" + String.format("%.2f", comision) + 
                                           " y su saldo actual es $" + String.format("%.2f", saldoActual));
            }

            double nuevoSaldo = saldoActual - comision;

            // Actualización atómica en la transacción
            t.update(docRef, WALLET_FIELD, nuevoSaldo);
            
            return String.format("Comisión aplicada con éxito. [Tarifa: %.2f | Comisión (10%%): %.2f | Nuevo Saldo: %.2f]", 
                                 tarifaViaje, comision, nuevoSaldo);
        });

        return transaction.get();
    }

    /**
     * RECARGA DE SALDO:
     * Incrementa el saldo de la billetera cuando el conductor realiza un pago.
     */
    public String recargarSaldo(String usuarioId, double monto) throws ExecutionException, InterruptedException {
        if (monto <= 0) throw new IllegalArgumentException("El monto de recarga debe ser mayor a cero.");

        Firestore db = getDb();
        DocumentReference docRef = db.collection(COLLECTION_NAME).document(usuarioId);

        ApiFuture<String> transaction = db.runTransaction(t -> {
            DocumentSnapshot snapshot = t.get(docRef).get();
            if (!snapshot.exists()) throw new RuntimeException("Usuario no encontrado en Firestore para recargar saldo.");

            Double saldoActual = snapshot.getDouble(WALLET_FIELD);
            if (saldoActual == null) saldoActual = 0.0;

            double nuevoSaldo = saldoActual + monto;
            t.update(docRef, WALLET_FIELD, nuevoSaldo);

            return String.format("Recarga procesada. Saldo anterior: $%.2f | Monto abonado: $%.2f | Saldo actual: $%.2f", 
                                 saldoActual, monto, nuevoSaldo);
        });

        return transaction.get();
    }

    /**
     * GUARDAR O ACTUALIZAR:
     * Crea un perfil o actualiza uno existente. Implementa Merge para no sobreescribir otros campos.
     */
    public String guardarUsuario(Usuario usuario) throws ExecutionException, InterruptedException {
        Firestore db = getDb();
        DocumentReference docRef;
        
        if (usuario.getId() == null || usuario.getId().trim().isEmpty()) {
            // Generación de ID automático por Firestore
            docRef = db.collection(COLLECTION_NAME).document();
            usuario.setId(docRef.getId());
            
            // Si el usuario es nuevo y no tiene saldo, podemos asignar un incentivo inicial
            if (usuario.getSaldoWallet() == null) {
                usuario.setSaldoWallet(15.0); 
            }
        } else {
            // Usar ID manual (UID de Auth o externo)
            docRef = db.collection(COLLECTION_NAME).document(usuario.getId());
        }
        
        // set con merge para actualizar solo lo que viene en el objeto sin borrar lo demás
        docRef.set(usuario, SetOptions.merge()).get();
        return "Usuario sincronizado: " + usuario.getNombre() + " (ID: " + usuario.getId() + ")";
    }

    /**
     * OBTENER POR ID:
     * Busca un documento específico y lo mapea al POJO Usuario.
     */
    public Usuario obtenerUsuarioPorId(String id) throws ExecutionException, InterruptedException {
        DocumentReference docRef = getDb().collection(COLLECTION_NAME).document(id);
        DocumentSnapshot document = docRef.get().get();
        
        if (document.exists()) {
            Usuario user = document.toObject(Usuario.class);
            if (user != null) user.setId(document.getId());
            return user;
        }
        return null;
    }

    /**
     * LISTAR TODOS:
     * Recupera todos los documentos de la colección 'usuarios'.
     */
    public List<Usuario> listarTodos() throws ExecutionException, InterruptedException {
        QuerySnapshot querySnapshot = getDb().collection(COLLECTION_NAME).get().get();
        List<Usuario> listaUsuarios = new ArrayList<>();
        
        for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
            Usuario user = doc.toObject(Usuario.class);
            if (user != null) {
                user.setId(doc.getId());
                listaUsuarios.add(user);
            }
        }
        return listaUsuarios;
    }

    /**
     * ELIMINAR:
     * Remueve el documento de Firestore de forma permanente.
     */
    public String eliminarUsuario(String id) throws ExecutionException, InterruptedException {
        getDb().collection(COLLECTION_NAME).document(id).delete().get();
        return "Registro eliminado exitosamente de Firestore (ID: " + id + ").";
    }
}