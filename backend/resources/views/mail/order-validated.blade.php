<h1>¡Pago validado, {{ $order->customer_name }}!</h1>
<p>Tu pedido #{{ $order->id }} fue aprobado. Estos son tus boletos:</p>
<ul>
@foreach ($order->tickets as $ticket)
    <li><strong>{{ $ticket->number }}</strong></li>
@endforeach
</ul>
<p>Total: RD$ {{ $order->total_amount }}</p>
<p>Puedes ver tu pedido aquí: <a href="{{ config('app.url') }}/{{ $order->customer_slug }}/{{ $order->public_view_token }}">ver mi pedido</a></p>
<p>¡Mucha suerte!</p>
