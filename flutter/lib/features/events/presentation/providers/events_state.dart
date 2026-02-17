import 'package:eventosapp/features/events/domain/entities/event_entity.dart';
import 'package:eventosapp/features/events/domain/entities/event_product_entity.dart';
import 'package:eventosapp/features/events/domain/entities/event_extra_entity.dart';
import 'package:eventosapp/features/events/domain/entities/event_ingredient_entity.dart';

class EventsState {
  final List<EventEntity> events;
  final bool isLoading;
  final String? errorMessage;
  final int currentPage;
  final int totalPages;
  final String? currentFilter;
  final EventEntity? selectedEvent;

  const EventsState({
    this.events = const [],
    this.isLoading = false,
    this.errorMessage,
    this.currentPage = 1,
    this.totalPages = 1,
    this.currentFilter,
    this.selectedEvent,
  });

  EventsState copyWith({
    List<EventEntity>? events,
    bool? isLoading,
    String? errorMessage,
    int? currentPage,
    int? totalPages,
    String? currentFilter,
    EventEntity? selectedEvent,
  }) {
    return EventsState(
      events: events ?? this.events,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages ?? this.totalPages,
      currentFilter: currentFilter ?? this.currentFilter,
      selectedEvent: selectedEvent ?? this.selectedEvent,
    );
  }

  EventsState loading() => copyWith(isLoading: true);
  EventsState error(String message) => copyWith(errorMessage: message, isLoading: false);
  EventsState loaded(List<EventEntity> events) => copyWith(
    events: events,
    isLoading: false,
    errorMessage: null,
  );
  EventsState withEvent(EventEntity event) => copyWith(
    selectedEvent: event,
  );

  EventsState withFilter(String filter) => copyWith(
    currentFilter: filter,
  );
}

class EventDetailState {
  final EventEntity? event;
  final List<EventProductEntity> products;
  final List<EventExtraEntity> extras;
  final List<EventIngredientEntity> ingredients;
  final bool isLoading;
  final String? errorMessage;

  const EventDetailState({
    this.event,
    this.products = const [],
    this.extras = const [],
    this.ingredients = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  EventDetailState copyWith({
    EventEntity? event,
    List<EventProductEntity>? products,
    List<EventExtraEntity>? extras,
    List<EventIngredientEntity>? ingredients,
    bool? isLoading,
    String? errorMessage,
  }) {
    return EventDetailState(
      event: event ?? this.event,
      products: products ?? this.products,
      extras: extras ?? this.extras,
      ingredients: ingredients ?? this.ingredients,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  EventDetailState loading() => copyWith(isLoading: true);
  EventDetailState error(String message) => copyWith(errorMessage: message, isLoading: false);
  EventDetailState loaded(EventEntity event) => copyWith(
        event: event,
        isLoading: false,
        errorMessage: null,
      );
}
