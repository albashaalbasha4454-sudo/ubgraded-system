// components/AdvancedInvoiceView.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AdvancedInvoiceView = ({ invoice }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Invoice #{invoice.id}</Text>
            <Text style={styles.date}>Date: {new Date(invoice.date).toLocaleDateString()}</Text>
            <View style={styles.itemsContainer}>
                {invoice.items.map(item => (
                    <View key={item.id} style={styles.item}> 
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                    </View>
                ))}
            </View>
            <Text style={styles.total}>Total: ${invoice.total.toFixed(2)}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    date: {
        fontSize: 14,
        color: '#888',
        marginBottom: 10,
    },
    itemsContainer: {
        marginBottom: 10,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    itemName: {
        fontSize: 16,
    },
    itemPrice: {
        fontSize: 16,
        color: '#333',
    },
    total: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default AdvancedInvoiceView;