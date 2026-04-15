export default function ChatbotSimple() {
  console.log('✅ ChatbotSimple se está renderizando');
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '80px',
        height: '80px',
        backgroundColor: '#9333ea',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '24px',
        fontWeight: 'bold',
        cursor: 'pointer',
        zIndex: 999999,
        boxShadow: '0 10px 40px rgba(147, 51, 234, 0.5)'
      }}
      onClick={() => alert('¡El botón funciona!')}
    >
      AI
    </div>
  );
}
