<h1>Pago no validado</h1>
<p>Hola {{ $order->customer_name }}, tu pedido #{{ $order->id }} no pudo validarse.</p>
@if ($reason)
<p>Motivo: {{ $reason }}</p>
@endif
<p>Si crees que es un error, contáctanos por WhatsApp y te ayudamos.</p>
